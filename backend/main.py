import sys
import os
import time
import traceback
import re

# Add the project root to Python path so Scrapling can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from typing import Optional, List, Literal

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    url: str
    fetcher_type: str = "fetcher"  # "fetcher" | "dynamic" | "stealthy"
    method: str = "get"  # for Fetcher only: get, post, put, delete
    extraction_type: str = "markdown"  # markdown, html, text
    css_selector: Optional[str] = None
    main_content_only: bool = True
    # Common options
    timeout: Optional[int] = 30
    proxy: Optional[str] = None
    headers: Optional[dict] = None
    cookies: Optional[dict] = None
    # Body data
    body: Optional[str] = None
    body_type: Optional[str] = None  # json, form, raw
    # Fetcher-specific
    retries: Optional[int] = 3
    retry_delay: Optional[int] = 1
    follow_redirects: bool = True
    impersonate: Optional[str] = "chrome"
    http3: bool = False
    stealthy_headers: bool = True
    # DynamicFetcher-specific
    headless: bool = True
    network_idle: bool = False
    wait: Optional[int] = None
    disable_resources: bool = False
    wait_selector: Optional[str] = None
    wait_selector_state: Optional[str] = "visible"  # visible, hidden, attached, detached
    google_search: bool = True
    # StealthyFetcher-specific
    solve_cloudflare: bool = False
    hide_canvas: bool = False
    block_webrtc: bool = False
    allow_webgl: bool = False
    # Advanced options
    verify_ssl: bool = True
    locale: Optional[str] = None
    useragent: Optional[str] = None
    real_chrome: bool = False
    cdp_url: Optional[str] = None
    timezone_id: Optional[str] = None
    max_redirects: Optional[int] = 10


class BulkScrapeRequest(BaseModel):
    urls: List[str]
    fetcher_type: str = "fetcher"
    method: str = "get"
    extraction_type: str = "markdown"
    css_selector: Optional[str] = None
    main_content_only: bool = True
    timeout: Optional[int] = 30
    proxy: Optional[str] = None
    headers: Optional[dict] = None
    cookies: Optional[dict] = None


class ParseCurlRequest(BaseModel):
    curl_command: str


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/scrape")
async def scrape(req: ScrapeRequest):
    start_time = time.time()

    try:
        from scrapling.fetchers import Fetcher, DynamicFetcher, StealthyFetcher
        from scrapling.core.shell import Convertor

        response = None

        if req.fetcher_type == "fetcher":
            method_kwargs = {
                "timeout": req.timeout,
                "retries": req.retries,
                "retry_delay": req.retry_delay,
                "follow_redirects": req.follow_redirects,
                "impersonate": req.impersonate or "chrome",
                "http3": req.http3,
                "stealthy_headers": req.stealthy_headers,
            }
            if req.proxy:
                method_kwargs["proxy"] = req.proxy
            if req.headers:
                method_kwargs["headers"] = req.headers
            if req.cookies:
                method_kwargs["cookies"] = req.cookies
            if not req.verify_ssl:
                method_kwargs["verify"] = False
            if req.useragent:
                method_kwargs["useragent"] = req.useragent
            if req.max_redirects:
                method_kwargs["max_redirects"] = req.max_redirects
            
            # Handle body data for POST/PUT
            if req.body and req.method.lower() in ("post", "put"):
                if req.body_type == "json":
                    method_kwargs["json"] = req.body
                else:
                    method_kwargs["data"] = req.body

            method_fn = getattr(Fetcher, req.method.lower(), Fetcher.get)
            response = method_fn(req.url, **method_kwargs)

        elif req.fetcher_type == "dynamic":
            fetch_kwargs = {
                "headless": req.headless,
                "network_idle": req.network_idle,
                "timeout": req.timeout,
                "disable_resources": req.disable_resources,
                "google_search": req.google_search,
            }
            if req.proxy:
                fetch_kwargs["proxy"] = {"server": req.proxy}
            if req.wait:
                fetch_kwargs["wait"] = req.wait
            if req.wait_selector:
                fetch_kwargs["wait_selector"] = req.wait_selector
                if req.wait_selector_state:
                    fetch_kwargs["wait_selector_state"] = req.wait_selector_state
            if req.locale:
                fetch_kwargs["locale"] = req.locale
            if req.timezone_id:
                fetch_kwargs["timezone_id"] = req.timezone_id
            if req.useragent:
                fetch_kwargs["useragent"] = req.useragent

            response = DynamicFetcher.fetch(req.url, **fetch_kwargs)

        elif req.fetcher_type == "stealthy":
            fetch_kwargs = {
                "headless": req.headless,
                "network_idle": req.network_idle,
                "timeout": req.timeout,
                "disable_resources": req.disable_resources,
                "google_search": req.google_search,
                "block_webrtc": req.block_webrtc,
                "allow_webgl": req.allow_webgl,
                "hide_canvas": req.hide_canvas,
            }
            if req.proxy:
                fetch_kwargs["proxy"] = {"server": req.proxy}
            if req.wait:
                fetch_kwargs["wait"] = req.wait
            if req.wait_selector:
                fetch_kwargs["wait_selector"] = req.wait_selector
                if req.wait_selector_state:
                    fetch_kwargs["wait_selector_state"] = req.wait_selector_state
            if req.solve_cloudflare:
                fetch_kwargs["solve_cloudflare"] = True
            if req.locale:
                fetch_kwargs["locale"] = req.locale
            if req.timezone_id:
                fetch_kwargs["timezone_id"] = req.timezone_id
            if req.useragent:
                fetch_kwargs["useragent"] = req.useragent
            if req.real_chrome:
                fetch_kwargs["real_chrome"] = True
            if req.cdp_url:
                fetch_kwargs["cdp_url"] = req.cdp_url

            response = StealthyFetcher.fetch(req.url, **fetch_kwargs)

        else:
            return fastapi.responses.JSONResponse(
                status_code=400,
                content={"error": f"Unknown fetcher type: {req.fetcher_type}"},
            )

        # Extract content using Convertor
        content_parts = list(
            Convertor._extract_content(
                response,
                extraction_type=req.extraction_type,
                css_selector=req.css_selector,
                main_content_only=req.main_content_only,
            )
        )
        content = "".join(content_parts)

        elapsed = round(time.time() - start_time, 3)

        # Serialize cookies
        cookies_data = {}
        if response.cookies:
            if isinstance(response.cookies, dict):
                cookies_data = response.cookies
            elif isinstance(response.cookies, (list, tuple)):
                for c in response.cookies:
                    if isinstance(c, dict):
                        cookies_data.update(c)

        # Serialize headers
        headers_data = {}
        if response.headers:
            headers_data = dict(response.headers) if not isinstance(response.headers, dict) else response.headers

        return {
            "status": response.status,
            "reason": response.reason,
            "url": response.url,
            "content": content,
            "headers": headers_data,
            "cookies": cookies_data,
            "elapsed": elapsed,
        }

    except Exception as e:
        elapsed = round(time.time() - start_time, 3)
        return fastapi.responses.JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc(),
                "elapsed": elapsed,
            },
        )


@app.post("/api/bulk-scrape")
async def bulk_scrape(req: BulkScrapeRequest):
    """
    Scrape multiple URLs sequentially.
    Returns a list of results for each URL.
    """
    results = []
    
    for url in req.urls:
        start_time = time.time()
        
        try:
            from scrapling.fetchers import Fetcher, DynamicFetcher, StealthyFetcher
            from scrapling.core.shell import Convertor

            response = None

            if req.fetcher_type == "fetcher":
                method_kwargs = {
                    "timeout": req.timeout,
                }
                if req.proxy:
                    method_kwargs["proxy"] = req.proxy
                if req.headers:
                    method_kwargs["headers"] = req.headers
                if req.cookies:
                    method_kwargs["cookies"] = req.cookies

                method_fn = getattr(Fetcher, req.method.lower(), Fetcher.get)
                response = method_fn(url, **method_kwargs)

            elif req.fetcher_type == "dynamic":
                fetch_kwargs = {
                    "timeout": req.timeout,
                }
                if req.proxy:
                    fetch_kwargs["proxy"] = {"server": req.proxy}

                response = DynamicFetcher.fetch(url, **fetch_kwargs)

            elif req.fetcher_type == "stealthy":
                fetch_kwargs = {
                    "timeout": req.timeout,
                }
                if req.proxy:
                    fetch_kwargs["proxy"] = {"server": req.proxy}

                response = StealthyFetcher.fetch(url, **fetch_kwargs)

            else:
                results.append({
                    "url": url,
                    "status": "error",
                    "error": f"Unknown fetcher type: {req.fetcher_type}",
                })
                continue

            # Extract content
            content_parts = list(
                Convertor._extract_content(
                    response,
                    extraction_type=req.extraction_type,
                    css_selector=req.css_selector,
                    main_content_only=req.main_content_only,
                )
            )
            content = "".join(content_parts)

            elapsed = round(time.time() - start_time, 3)

            # Serialize cookies
            cookies_data = {}
            if response.cookies:
                if isinstance(response.cookies, dict):
                    cookies_data = response.cookies
                elif isinstance(response.cookies, (list, tuple)):
                    for c in response.cookies:
                        if isinstance(c, dict):
                            cookies_data.update(c)

            # Serialize headers
            headers_data = {}
            if response.headers:
                headers_data = dict(response.headers) if not isinstance(response.headers, dict) else response.headers

            results.append({
                "url": url,
                "status": "success",
                "response": {
                    "status": response.status,
                    "reason": response.reason,
                    "url": response.url,
                    "content": content,
                    "headers": headers_data,
                    "cookies": cookies_data,
                    "elapsed": elapsed,
                }
            })

        except Exception as e:
            elapsed = round(time.time() - start_time, 3)
            results.append({
                "url": url,
                "status": "error",
                "error": str(e),
                "elapsed": elapsed,
            })

    return {"results": results}


@app.post("/api/parse-curl")
async def parse_curl(req: ParseCurlRequest):
    """
    Parse a curl command and extract URL, method, headers, cookies, and body.
    This is a simple parser - the frontend has a more complete one.
    """
    try:
        curl_str = req.curl_command.strip()
        
        if not curl_str.lower().startswith('curl'):
            return fastapi.responses.JSONResponse(
                status_code=400,
                content={"error": "Command must start with 'curl'"},
            )

        result = {
            "url": "",
            "method": "get",
            "headers": {},
            "cookies": {},
            "body": "",
            "body_type": "none",
        }

        # Normalize the command (remove line continuations)
        normalized = re.sub(r'\\\r?\n', ' ', curl_str)
        normalized = re.sub(r'\s+', ' ', normalized)

        # Extract URL
        url_match = re.search(r'curl\s+(?:-[^\s]+\s+)*[\'"]?(https?://[^\s\'"]+)[\'"]?', normalized, re.IGNORECASE)
        if url_match:
            result["url"] = url_match.group(1).strip('"\'')

        # Extract method
        method_match = re.search(r'-X\s+[\'"]?(\w+)[\'"]?', normalized, re.IGNORECASE)
        if not method_match:
            method_match = re.search(r'--request\s+[\'"]?(\w+)[\'"]?', normalized, re.IGNORECASE)
        if method_match:
            result["method"] = method_match.group(1).lower()

        # Extract headers
        header_pattern = re.compile(r'(?:-H|--header)\s+[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
        for match in header_pattern.finditer(normalized):
            header_line = match.group(1)
            colon_idx = header_line.find(':')
            if colon_idx != -1:
                key = header_line[:colon_idx].strip()
                value = header_line[colon_idx + 1:].strip()
                
                if key.lower() == 'cookie':
                    # Parse cookie header
                    for cookie_pair in value.split(';'):
                        eq_idx = cookie_pair.find('=')
                        if eq_idx != -1:
                            c_key = cookie_pair[:eq_idx].strip()
                            c_value = cookie_pair[eq_idx + 1:].strip()
                            result["cookies"][c_key] = c_value
                else:
                    result["headers"][key] = value

        # Extract body data
        data_match = re.search(r'(?:-d|--data(?:-raw|-binary)?)\s+[\'"]([^\'"]+)[\'"]', normalized, re.IGNORECASE)
        if not data_match:
            data_match = re.search(r'(?:-d|--data(?:-raw|-binary)?)\s+([^\s]+)', normalized, re.IGNORECASE)
        
        if data_match:
            result["body"] = data_match.group(1)
            
            if result["body"].startswith('{') or result["body"].startswith('['):
                result["body_type"] = "json"
            elif '=' in result["body"]:
                result["body_type"] = "form"
            else:
                result["body_type"] = "raw"
            
            # If there's body data and method is GET, assume POST
            if result["method"] == "get":
                result["method"] = "post"

        # Extract cookies from -b or --cookie
        cookie_match = re.search(r'(?:-b|--cookie)\s+[\'"]([^\'"]+)[\'"]', normalized, re.IGNORECASE)
        if cookie_match:
            for cookie_pair in cookie_match.group(1).split(';'):
                eq_idx = cookie_pair.find('=')
                if eq_idx != -1:
                    c_key = cookie_pair[:eq_idx].strip()
                    c_value = cookie_pair[eq_idx + 1:].strip()
                    result["cookies"][c_key] = c_value

        if not result["url"]:
            return fastapi.responses.JSONResponse(
                status_code=400,
                content={"error": "Could not extract URL from curl command"},
            )

        return result

    except Exception as e:
        return fastapi.responses.JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()},
        )

import sys
import os
import time
import traceback

# Add the project root to Python path so Scrapling can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import fastapi
import fastapi.middleware.cors
import fastapi.responses
from pydantic import BaseModel
from typing import Optional

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check which fetchers are available
AVAILABLE_FETCHERS = {"fetcher": False, "dynamic": False, "stealthy": False}

try:
    from scrapling.fetchers import Fetcher
    AVAILABLE_FETCHERS["fetcher"] = True
except Exception:
    pass

try:
    from scrapling.fetchers import DynamicFetcher
    AVAILABLE_FETCHERS["dynamic"] = True
except Exception:
    pass

try:
    from scrapling.fetchers import StealthyFetcher
    AVAILABLE_FETCHERS["stealthy"] = True
except Exception:
    pass

# Try to import Convertor for content extraction
CONVERTOR_AVAILABLE = False
try:
    from scrapling.engines.toolbelt.convertor import Convertor
    CONVERTOR_AVAILABLE = True
except Exception:
    pass


class ScrapeRequest(BaseModel):
    url: str
    fetcher_type: str = "fetcher"
    method: str = "get"
    extraction_type: str = "markdown"
    css_selector: Optional[str] = None
    main_content_only: bool = True
    timeout: Optional[int] = 30
    proxy: Optional[str] = None
    headers: Optional[dict] = None
    cookies: Optional[dict] = None
    retries: Optional[int] = 3
    retry_delay: Optional[int] = 1
    follow_redirects: bool = True
    impersonate: Optional[str] = "chrome"
    http3: bool = False
    stealthy_headers: bool = True
    headless: bool = True
    network_idle: bool = False
    wait: Optional[int] = None
    disable_resources: bool = False
    wait_selector: Optional[str] = None
    google_search: bool = True
    solve_cloudflare: bool = False
    hide_canvas: bool = False
    block_webrtc: bool = False
    allow_webgl: bool = False


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "available_fetchers": AVAILABLE_FETCHERS,
        "convertor_available": CONVERTOR_AVAILABLE,
    }


def extract_content(response, extraction_type, css_selector, main_content_only):
    """Extract content from a Scrapling response object."""
    if CONVERTOR_AVAILABLE:
        try:
            parts = list(
                Convertor._extract_content(
                    response,
                    extraction_type=extraction_type,
                    css_selector=css_selector,
                    main_content_only=main_content_only,
                )
            )
            return "".join(parts)
        except Exception:
            pass

    # Fallback: return the response text/body directly
    text = ""
    if hasattr(response, "text"):
        text = response.text
    elif hasattr(response, "body"):
        text = response.body if isinstance(response.body, str) else response.body.decode("utf-8", errors="replace")

    if extraction_type == "html":
        return text
    # For markdown/text without Convertor, just return raw text
    return text


def serialize_response(response):
    """Safely serialize response headers and cookies."""
    headers_data = {}
    if hasattr(response, "headers") and response.headers:
        try:
            headers_data = dict(response.headers) if not isinstance(response.headers, dict) else response.headers
        except Exception:
            headers_data = {}

    cookies_data = {}
    if hasattr(response, "cookies") and response.cookies:
        try:
            if isinstance(response.cookies, dict):
                cookies_data = response.cookies
            elif hasattr(response.cookies, "items"):
                cookies_data = dict(response.cookies)
        except Exception:
            cookies_data = {}

    return headers_data, cookies_data


@app.post("/api/scrape")
async def scrape(req: ScrapeRequest):
    start_time = time.time()

    if not AVAILABLE_FETCHERS.get(req.fetcher_type, False):
        available = [k for k, v in AVAILABLE_FETCHERS.items() if v]
        return fastapi.responses.JSONResponse(
            status_code=400,
            content={
                "error": f"Fetcher '{req.fetcher_type}' is not available in this environment. Available: {available or 'none'}",
                "elapsed": round(time.time() - start_time, 3),
            },
        )

    try:
        response = None

        if req.fetcher_type == "fetcher":
            from scrapling.fetchers import Fetcher

            method_kwargs = {
                "timeout": req.timeout,
                "retries": req.retries,
                "retry_delay": req.retry_delay,
                "follow_redirects": req.follow_redirects,
                "stealthy_headers": req.stealthy_headers,
            }
            if req.impersonate:
                method_kwargs["impersonate"] = req.impersonate
            if req.proxy:
                method_kwargs["proxy"] = req.proxy
            if req.headers:
                method_kwargs["headers"] = req.headers
            if req.cookies:
                method_kwargs["cookies"] = req.cookies
            if req.http3:
                method_kwargs["http3"] = True

            method_fn = getattr(Fetcher, req.method.lower(), Fetcher.get)
            response = method_fn(req.url, **method_kwargs)

        elif req.fetcher_type == "dynamic":
            from scrapling.fetchers import DynamicFetcher

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

            response = DynamicFetcher.fetch(req.url, **fetch_kwargs)

        elif req.fetcher_type == "stealthy":
            from scrapling.fetchers import StealthyFetcher

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
            if req.solve_cloudflare:
                fetch_kwargs["solve_cloudflare"] = True

            response = StealthyFetcher.fetch(req.url, **fetch_kwargs)

        content = extract_content(
            response,
            extraction_type=req.extraction_type,
            css_selector=req.css_selector,
            main_content_only=req.main_content_only,
        )

        headers_data, cookies_data = serialize_response(response)
        elapsed = round(time.time() - start_time, 3)

        return {
            "status": getattr(response, "status", 0),
            "reason": getattr(response, "reason", ""),
            "url": getattr(response, "url", req.url),
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

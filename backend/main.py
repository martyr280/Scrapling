import time
import traceback

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Realistic browser headers matching Scrapling's stealthy_headers approach
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}


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
    # Dynamic/Stealthy options (noted but not used with httpx backend)
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


def extract_content(
    html: str,
    extraction_type: str,
    css_selector: Optional[str],
    main_content_only: bool,
) -> str:
    """Extract content from HTML using BeautifulSoup, mirroring Scrapling's Convertor."""
    soup = BeautifulSoup(html, "lxml")

    # Remove script, style, nav, footer, header noise if main_content_only
    if main_content_only:
        for tag in soup.find_all(["script", "style", "noscript", "nav", "footer", "aside", "iframe"]):
            tag.decompose()

    # Apply CSS selector if provided
    target = soup
    if css_selector:
        selected = soup.select(css_selector)
        if selected:
            new_soup = BeautifulSoup("", "lxml")
            for el in selected:
                new_soup.append(el)
            target = new_soup

    if main_content_only:
        # Try to find the main content area
        body = target.find("body")
        if body:
            # Look for common main content containers
            main = (
                body.find("main")
                or body.find("article")
                or body.find(attrs={"role": "main"})
                or body.find(id="content")
                or body.find(id="main")
                or body.find(class_="content")
            )
            if main:
                target = main

    html_str = str(target)

    if extraction_type == "html":
        return html_str
    elif extraction_type == "markdown":
        return md(html_str, heading_style="ATX", strip=["img"])
    else:
        # plain text
        text = target.get_text(separator="\n", strip=True)
        # Collapse multiple blank lines
        lines = text.splitlines()
        result = []
        prev_blank = False
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if not prev_blank:
                    result.append("")
                prev_blank = True
            else:
                result.append(stripped)
                prev_blank = False
        return "\n".join(result)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "available_fetchers": {
            "fetcher": True,
            "dynamic": False,
            "stealthy": False,
        },
        "convertor_available": True,
        "note": "Running with httpx backend. Dynamic and Stealthy fetchers require Playwright/Camoufox.",
    }


@app.post("/api/scrape")
async def scrape(req: ScrapeRequest):
    start_time = time.time()

    # Dynamic and Stealthy require browser engines not available here
    if req.fetcher_type in ("dynamic", "stealthy"):
        elapsed = round(time.time() - start_time, 3)
        return JSONResponse(
            status_code=400,
            content={
                "error": f"'{req.fetcher_type}' fetcher requires browser engines (Playwright/Camoufox) which are not available in this environment. Use 'fetcher' for HTTP-based scraping.",
                "elapsed": elapsed,
            },
        )

    try:
        # Build request headers
        request_headers = dict(DEFAULT_HEADERS) if req.stealthy_headers else {}
        if req.headers:
            request_headers.update(req.headers)

        # Build httpx client kwargs
        client_kwargs: dict = {
            "timeout": float(req.timeout or 30),
            "follow_redirects": req.follow_redirects,
            "headers": request_headers,
        }
        if req.proxy:
            client_kwargs["proxy"] = req.proxy

        # Retry logic matching Scrapling's Fetcher behavior
        last_exc = None
        response = None
        retries = req.retries or 0

        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(**client_kwargs) as client:
                    method_fn = getattr(client, req.method.lower(), client.get)
                    response = await method_fn(
                        req.url,
                        cookies=req.cookies or None,
                    )
                break
            except Exception as e:
                last_exc = e
                if attempt < retries:
                    import asyncio
                    await asyncio.sleep(req.retry_delay or 1)

        if response is None:
            raise last_exc or Exception("Request failed after all retries")

        # Extract content
        content = extract_content(
            html=response.text,
            extraction_type=req.extraction_type,
            css_selector=req.css_selector,
            main_content_only=req.main_content_only,
        )

        # Serialize response data
        headers_data = dict(response.headers)
        cookies_data = {k: v for k, v in response.cookies.items()}
        elapsed = round(time.time() - start_time, 3)

        return {
            "status": response.status_code,
            "reason": response.reason_phrase or "",
            "url": str(response.url),
            "content": content,
            "headers": headers_data,
            "cookies": cookies_data,
            "elapsed": elapsed,
        }

    except Exception as e:
        elapsed = round(time.time() - start_time, 3)
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc(),
                "elapsed": elapsed,
            },
        )

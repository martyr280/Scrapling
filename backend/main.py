import sys
import os
import time
import traceback

# Add the project root to Python path so Scrapling can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import fastapi
import fastapi.middleware.cors
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
    google_search: bool = True
    # StealthyFetcher-specific
    solve_cloudflare: bool = False
    hide_canvas: bool = False
    block_webrtc: bool = False
    allow_webgl: bool = False


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
            if req.solve_cloudflare:
                fetch_kwargs["solve_cloudflare"] = True

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

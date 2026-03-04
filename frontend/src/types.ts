export type FetcherType = 'fetcher' | 'dynamic' | 'stealthy'
export type HttpMethod = 'get' | 'post' | 'put' | 'delete'
export type ExtractionType = 'markdown' | 'html' | 'text'

export interface ScrapeRequest {
  url: string
  fetcher_type: FetcherType
  method: HttpMethod
  extraction_type: ExtractionType
  css_selector: string
  main_content_only: boolean
  timeout: number
  proxy: string
  headers: Record<string, string>
  cookies: Record<string, string>
  // Fetcher-specific
  retries: number
  retry_delay: number
  follow_redirects: boolean
  impersonate: string
  http3: boolean
  stealthy_headers: boolean
  // DynamicFetcher-specific
  headless: boolean
  network_idle: boolean
  wait: number | null
  disable_resources: boolean
  wait_selector: string
  google_search: boolean
  // StealthyFetcher-specific
  solve_cloudflare: boolean
  hide_canvas: boolean
  block_webrtc: boolean
  allow_webgl: boolean
}

export interface ScrapeResponse {
  status: number
  reason: string
  url: string
  content: string
  headers: Record<string, string>
  cookies: Record<string, string>
  elapsed: number
}

export interface ScrapeError {
  error: string
  traceback?: string
  elapsed?: number
}

export interface HeaderPair {
  key: string
  value: string
  id: string
}

export const DEFAULT_REQUEST: ScrapeRequest = {
  url: '',
  fetcher_type: 'fetcher',
  method: 'get',
  extraction_type: 'markdown',
  css_selector: '',
  main_content_only: true,
  timeout: 30,
  proxy: '',
  headers: {},
  cookies: {},
  retries: 3,
  retry_delay: 1,
  follow_redirects: true,
  impersonate: 'chrome',
  http3: false,
  stealthy_headers: true,
  headless: true,
  network_idle: false,
  wait: null,
  disable_resources: false,
  wait_selector: '',
  google_search: true,
  solve_cloudflare: false,
  hide_canvas: false,
  block_webrtc: false,
  allow_webgl: false,
}

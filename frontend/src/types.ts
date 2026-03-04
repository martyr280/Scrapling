export type FetcherType = 'fetcher' | 'dynamic' | 'stealthy'
export type HttpMethod = 'get' | 'post' | 'put' | 'delete'
export type ExtractionType = 'markdown' | 'html' | 'text'
export type BodyType = 'none' | 'json' | 'form' | 'raw'
export type WaitSelectorState = 'visible' | 'hidden' | 'attached' | 'detached'

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
  // Body data
  body_type: BodyType
  body_content: string
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
  wait_selector_state: WaitSelectorState
  google_search: boolean
  // StealthyFetcher-specific
  solve_cloudflare: boolean
  hide_canvas: boolean
  block_webrtc: boolean
  allow_webgl: boolean
  // Advanced options
  verify_ssl: boolean
  locale: string
  useragent: string
  real_chrome: boolean
  cdp_url: string
  timezone_id: string
  max_redirects: number
}

// Bulk scraping
export interface BulkScrapeRequest {
  urls: string[]
  fetcher_type: FetcherType
  method: HttpMethod
  extraction_type: ExtractionType
  css_selector: string
  main_content_only: boolean
  timeout: number
  proxy: string
  headers: Record<string, string>
  cookies: Record<string, string>
}

export interface BulkScrapeResult {
  url: string
  status: 'success' | 'error'
  response?: ScrapeResponse
  error?: string
}

// Proxy management
export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5'
export type RotationStrategy = 'round-robin' | 'random' | 'least-used'

export interface ProxyConfig {
  enabled: boolean
  proxies: string[]
  protocol: ProxyProtocol
  rotation_strategy: RotationStrategy
}

// Scrape history
export interface ScrapeHistoryItem {
  id: string
  url: string
  method: HttpMethod
  fetcher_type: FetcherType
  status: number
  elapsed: number
  timestamp: number
  request: ScrapeRequest
  response: ScrapeResponse
}

// Curl import
export interface ParsedCurl {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  cookies: Record<string, string>
  body: string
  body_type: BodyType
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
  body_type: 'none',
  body_content: '',
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
  wait_selector_state: 'visible',
  google_search: true,
  solve_cloudflare: false,
  hide_canvas: false,
  block_webrtc: false,
  allow_webgl: false,
  verify_ssl: true,
  locale: '',
  useragent: '',
  real_chrome: false,
  cdp_url: '',
  timezone_id: '',
  max_redirects: 10,
}

export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: false,
  proxies: [],
  protocol: 'http',
  rotation_strategy: 'round-robin',
}

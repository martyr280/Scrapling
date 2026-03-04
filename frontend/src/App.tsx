import { useState, useCallback, useEffect } from 'react'
import { Send, RotateCcw, FileCode, SlidersHorizontal, Braces } from 'lucide-react'
import FetcherSelector from './components/FetcherSelector'
import HeaderEditor from './components/HeaderEditor'
import OptionsPanel from './components/OptionsPanel'
import ResponsePanel from './components/ResponsePanel'
import BulkScrapePanel from './components/BulkScrapePanel'
import CurlImportModal from './components/CurlImportModal'
import BodyEditor from './components/BodyEditor'
import CookiesEditor from './components/CookiesEditor'
import ScrapeHistory from './components/ScrapeHistory'
import ProxyManager from './components/ProxyManager'
import type { 
  ScrapeRequest, 
  ScrapeResponse, 
  ScrapeError, 
  HeaderPair, 
  HttpMethod, 
  ExtractionType, 
  FetcherType,
  ParsedCurl,
  ScrapeHistoryItem,
  ProxyConfig,
  BodyType,
} from './types'
import { DEFAULT_REQUEST, DEFAULT_PROXY_CONFIG } from './types'

type MainMode = 'single' | 'bulk'
type ConfigTab = 'basic' | 'headers' | 'cookies' | 'body' | 'options' | 'proxies'

const HTTP_METHODS: { value: HttpMethod; label: string; color: string }[] = [
  { value: 'get', label: 'GET', color: 'text-status-success' },
  { value: 'post', label: 'POST', color: 'text-amber-400' },
  { value: 'put', label: 'PUT', color: 'text-blue-400' },
  { value: 'delete', label: 'DELETE', color: 'text-status-error' },
]

interface HealthInfo {
  available_fetchers: Record<string, boolean>
  convertor_available: boolean
}

export default function App() {
  const [mainMode, setMainMode] = useState<MainMode>('single')
  const [request, setRequest] = useState<ScrapeRequest>({ ...DEFAULT_REQUEST })
  const [response, setResponse] = useState<ScrapeResponse | null>(null)
  const [error, setError] = useState<ScrapeError | null>(null)
  const [loading, setLoading] = useState(false)
  const [configTab, setConfigTab] = useState<ConfigTab>('basic')
  const [headerPairs, setHeaderPairs] = useState<HeaderPair[]>([])
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [backendReady, setBackendReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setHealth(data)
          setBackendReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setTimeout(checkHealth, 2000)
        }
      }
    }
    checkHealth()
    return () => { cancelled = true }
  }, [])

  const updateRequest = useCallback((updates: Partial<ScrapeRequest>) => {
    setRequest((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleFetcherChange = useCallback((type: FetcherType) => {
    updateRequest({ fetcher_type: type, method: 'get' })
  }, [updateRequest])

  const handleReset = useCallback(() => {
    setRequest({ ...DEFAULT_REQUEST })
    setResponse(null)
    setError(null)
    setHeaderPairs([])
    setCookiePairs([])
  }, [])

  const handleScrape = useCallback(async () => {
    if (!request.url.trim()) return

    setLoading(true)
    setResponse(null)
    setError(null)

    // Build headers from pairs
    const headersObj: Record<string, string> = {}
    for (const h of headerPairs) {
      if (h.key.trim()) headersObj[h.key.trim()] = h.value
    }

    // Build cookies from pairs
    const cookiesObj: Record<string, string> = {}
    for (const c of cookiePairs) {
      if (c.key.trim()) cookiesObj[c.key.trim()] = c.value
    }

    // Get proxy from rotation if enabled
    let proxy = request.proxy.trim() || undefined
    if (proxyConfig.enabled && proxyConfig.proxies.length > 0) {
      // Simple round-robin for now
      const proxyIndex = Math.floor(Math.random() * proxyConfig.proxies.length)
      const selectedProxy = proxyConfig.proxies[proxyIndex]
      proxy = `${proxyConfig.protocol}://${selectedProxy}`
    }

    const payload = {
      ...request,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      cookies: Object.keys(cookiesObj).length > 0 ? cookiesObj : undefined,
      css_selector: request.css_selector.trim() || undefined,
      proxy,
      wait_selector: request.wait_selector.trim() || undefined,
      wait: request.wait || undefined,
      body: request.body_type !== 'none' ? request.body_content : undefined,
      body_type: request.body_type !== 'none' ? request.body_type : undefined,
    }

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data as ScrapeError)
      } else {
        const responseData = data as ScrapeResponse
        setResponse(responseData)
        
        // Add to history
        const historyItem: ScrapeHistoryItem = {
          id: crypto.randomUUID(),
          url: request.url,
          method: request.method,
          fetcher_type: request.fetcher_type,
          status: responseData.status,
          elapsed: responseData.elapsed,
          timestamp: Date.now(),
          request: { ...request },
          response: responseData,
        }
        setHistory((prev) => [historyItem, ...prev.slice(0, MAX_HISTORY_ITEMS - 1)])
      }
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : 'Failed to connect to backend',
      })
    } finally {
      setLoading(false)
    }
  }, [request, headerPairs, cookiePairs, proxyConfig])

  const handleCurlImport = useCallback((parsed: ParsedCurl, newHeaders: HeaderPair[], newCookies: HeaderPair[]) => {
    updateRequest({
      url: parsed.url,
      method: parsed.method,
      body_type: parsed.body_type,
      body_content: parsed.body,
    })
    setHeaderPairs(newHeaders)
    setCookiePairs(newCookies)
  }, [updateRequest])

  const handleHistoryRestore = useCallback((item: ScrapeHistoryItem) => {
    setRequest({ ...item.request })
    setResponse(item.response)
    setError(null)
    setShowHistory(false)
    
    // Restore headers
    const newHeaders: HeaderPair[] = Object.entries(item.request.headers || {}).map(([key, value]) => ({
      key,
      value,
      id: crypto.randomUUID(),
    }))
    setHeaderPairs(newHeaders)
    
    // Restore cookies
    const newCookies: HeaderPair[] = Object.entries(item.request.cookies || {}).map(([key, value]) => ({
      key,
      value,
      id: crypto.randomUUID(),
    }))
    setCookiePairs(newCookies)
  }, [])

  const handleHistoryClear = useCallback(() => {
    setHistory([])
  }, [])

  const handleHistoryRemove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const configTabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic', icon: <SlidersHorizontal size={14} /> },
    { id: 'headers', label: 'Headers', icon: <Braces size={14} /> },
    { id: 'cookies', label: 'Cookies', icon: <Cookie size={14} /> },
    { id: 'body', label: 'Body', icon: <FileText size={14} /> },
    { id: 'options', label: 'Options', icon: <SlidersHorizontal size={14} /> },
    { id: 'proxies', label: 'Proxies', icon: <Shield size={14} /> },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-accent/10 rounded-lg">
            <FileCode size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100 font-mono tracking-tight">Scrapling</h1>
            <p className="text-[11px] text-zinc-500">Web Scraping Interface</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!backendReady && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Connecting to backend...
            </span>
          )}
          {backendReady && health && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Backend ready
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="px-6 pt-4">
        <div className="inline-flex items-center p-1 bg-surface-100 rounded-xl border border-border">
          <button
            onClick={() => setMainMode('single')}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
              ${mainMode === 'single'
                ? 'bg-accent text-surface'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            <Send size={14} />
            Single Request
          </button>
          <button
            onClick={() => setMainMode('bulk')}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
              ${mainMode === 'bulk'
                ? 'bg-accent text-surface'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            <Layers size={14} />
            Bulk Scrape
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-4 p-6 pt-4">
        {showHistory ? (
          <div className="flex-1 bg-surface-100 rounded-xl border border-border overflow-hidden">
            <ScrapeHistory
              history={history}
              onRestore={handleHistoryRestore}
              onClear={handleHistoryClear}
              onRemove={handleHistoryRemove}
            />
          </div>
        ) : mainMode === 'bulk' ? (
          <BulkScrapePanel 
            baseRequest={request} 
            onBaseRequestChange={updateRequest} 
          />
        ) : (
          <>
            {/* Fetcher Selector */}
            <section>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Fetcher Type
              </label>
              <FetcherSelector selected={request.fetcher_type} onChange={handleFetcherChange} />
            </section>

            {/* URL Bar */}
            <section className="flex gap-2">
              {request.fetcher_type === 'fetcher' && (
                <select
                  value={request.method}
                  onChange={(e) => updateRequest({ method: e.target.value as HttpMethod })}
                  className="bg-surface-100 border border-border rounded-xl px-3 py-3 text-sm font-mono font-medium focus:outline-none focus:border-accent/50 transition-colors cursor-pointer appearance-none min-w-[100px] text-center"
                  style={{ color: HTTP_METHODS.find((m) => m.value === request.method)?.color === 'text-status-success' ? '#22c55e' : HTTP_METHODS.find((m) => m.value === request.method)?.color === 'text-amber-400' ? '#fbbf24' : HTTP_METHODS.find((m) => m.value === request.method)?.color === 'text-blue-400' ? '#60a5fa' : '#ef4444' }}
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex-1 relative">
                <input
                  type="url"
                  value={request.url}
                  onChange={(e) => updateRequest({ url: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  placeholder="https://example.com"
                  className="w-full bg-surface-100 border border-border rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowCurlModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-surface-100 border border-border text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl hover:bg-surface-200 transition-colors cursor-pointer"
                title="Import from cURL"
              >
                <Terminal size={15} />
                cURL
              </button>
              <button
                onClick={handleScrape}
                disabled={loading || !request.url.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-surface font-medium text-sm rounded-xl hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send size={15} />
                Scrape
              </button>
            </section>

            {/* Two-column layout: Config + Response */}
            <div className="flex-1 flex gap-4 min-h-0" style={{ height: 'calc(100vh - 380px)' }}>
              {/* Config Panel */}
              <aside className="w-80 shrink-0 flex flex-col bg-surface-100 rounded-xl border border-border overflow-hidden">
                {/* Config Tabs */}
                <div className="flex flex-wrap border-b border-border">
                  {configTabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setConfigTab(t.id)}
                      className={`
                        flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer
                        ${configTab === t.id
                          ? 'text-accent border-b-2 border-accent -mb-px'
                          : 'text-zinc-500 hover:text-zinc-300'
                        }
                      `}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Config Content */}
                <div className="flex-1 overflow-auto p-4">
                  {configTab === 'basic' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Extraction Type
                        </label>
                        <div className="flex gap-1.5">
                          {(['markdown', 'html', 'text'] as ExtractionType[]).map((type) => (
                            <button
                              key={type}
                              onClick={() => updateRequest({ extraction_type: type })}
                              className={`
                                flex-1 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer
                                ${request.extraction_type === type
                                  ? 'bg-accent text-surface font-medium'
                                  : 'bg-surface-200 text-zinc-400 hover:text-zinc-300 hover:bg-surface-300'
                                }
                              `}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          CSS Selector
                        </label>
                        <input
                          type="text"
                          value={request.css_selector}
                          onChange={(e) => updateRequest({ css_selector: e.target.value })}
                          placeholder="body, .content, #main"
                          className="bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                        />
                        <span className="text-[11px] text-zinc-600">Filter results to specific elements</span>
                      </div>

                      <label className="flex items-center justify-between gap-3 cursor-pointer group">
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-300 group-hover:text-zinc-200 transition-colors">Main Content Only</span>
                          <span className="text-xs text-zinc-600">{'Extract from <body>, strip noise'}</span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={request.main_content_only}
                          onClick={() => updateRequest({ main_content_only: !request.main_content_only })}
                          className={`
                            relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer
                            ${request.main_content_only ? 'bg-accent' : 'bg-surface-300'}
                          `}
                        >
                          <span
                            className={`
                              absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
                              ${request.main_content_only ? 'translate-x-4' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </label>
                    </div>
                  )}
                  {configTab === 'headers' && (
                    <HeaderEditor headers={headerPairs} onChange={setHeaderPairs} />
                  )}
                  {configTab === 'cookies' && (
                    <CookiesEditor cookies={cookiePairs} onChange={setCookiePairs} />
                  )}
                  {configTab === 'body' && (
                    <BodyEditor
                      bodyType={request.body_type}
                      bodyContent={request.body_content}
                      onTypeChange={(type: BodyType) => updateRequest({ body_type: type })}
                      onContentChange={(content: string) => updateRequest({ body_content: content })}
                    />
                  )}
                  {configTab === 'options' && (
                    <OptionsPanel request={request} onChange={updateRequest} />
                  )}
                  {configTab === 'proxies' && (
                    <ProxyManager config={proxyConfig} onChange={setProxyConfig} />
                  )}
                </div>
              </aside>

              {/* Response Panel */}
              <ResponsePanel
                response={response}
                error={error}
                loading={loading}
                extractionType={request.extraction_type}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center px-6 py-3 border-t border-border">
        <p className="text-xs text-zinc-600">
          Powered by{' '}
          <a
            href="https://github.com/D4Vinci/Scrapling"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-accent transition-colors"
          >
            Scrapling
          </a>
          {' '}v0.4.1
        </p>
      </footer>

      {/* Curl Import Modal */}
      <CurlImportModal
        isOpen={showCurlModal}
        onClose={() => setShowCurlModal(false)}
        onImport={handleCurlImport}
      />
    </div>
  )
}

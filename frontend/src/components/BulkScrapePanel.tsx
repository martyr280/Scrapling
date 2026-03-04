import { useState, useCallback } from 'react'
import { Play, Square, CheckCircle2, XCircle, Clock, Download, Trash2 } from 'lucide-react'
import type { ScrapeRequest, BulkScrapeResult, ExtractionType, FetcherType } from '../types'
import FetcherSelector from './FetcherSelector'

interface Props {
  baseRequest: ScrapeRequest
  onBaseRequestChange: (updates: Partial<ScrapeRequest>) => void
}

export default function BulkScrapePanel({ baseRequest, onBaseRequestChange }: Props) {
  const [urlsText, setUrlsText] = useState('')
  const [results, setResults] = useState<BulkScrapeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const urls = urlsText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')))

  const handleBulkScrape = useCallback(async () => {
    if (urls.length === 0) return

    const controller = new AbortController()
    setAbortController(controller)
    setLoading(true)
    setResults([])
    setProgress({ current: 0, total: urls.length })

    const newResults: BulkScrapeResult[] = []

    for (let i = 0; i < urls.length; i++) {
      if (controller.signal.aborted) break

      const url = urls[i]
      setProgress({ current: i + 1, total: urls.length })

      try {
        const payload = {
          ...baseRequest,
          url,
          css_selector: baseRequest.css_selector.trim() || undefined,
          proxy: baseRequest.proxy.trim() || undefined,
          wait_selector: baseRequest.wait_selector.trim() || undefined,
          wait: baseRequest.wait || undefined,
        }

        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        const data = await res.json()

        if (!res.ok) {
          newResults.push({
            url,
            status: 'error',
            error: data.error || 'Request failed',
          })
        } else {
          newResults.push({
            url,
            status: 'success',
            response: data,
          })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') break
        newResults.push({
          url,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      setResults([...newResults])
    }

    setLoading(false)
    setAbortController(null)
  }, [urls, baseRequest])

  const handleStop = useCallback(() => {
    abortController?.abort()
    setLoading(false)
    setAbortController(null)
  }, [abortController])

  const handleClear = useCallback(() => {
    setResults([])
    setProgress({ current: 0, total: 0 })
  }, [])

  const handleExportAll = useCallback(() => {
    const successResults = results.filter((r) => r.status === 'success' && r.response)
    if (successResults.length === 0) return

    const exportData = successResults.map((r) => ({
      url: r.url,
      status: r.response?.status,
      content: r.response?.content,
      elapsed: r.response?.elapsed,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-scrape-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Config Section */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Fetcher Type
          </label>
          <FetcherSelector
            selected={baseRequest.fetcher_type}
            onChange={(type: FetcherType) => onBaseRequestChange({ fetcher_type: type })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Extraction Type
          </label>
          <div className="flex gap-1.5">
            {(['markdown', 'html', 'text'] as ExtractionType[]).map((type) => (
              <button
                key={type}
                onClick={() => onBaseRequestChange({ extraction_type: type })}
                className={`
                  flex-1 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer
                  ${baseRequest.extraction_type === type
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
      </div>

      {/* URL Input */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            URLs (one per line)
          </label>
          <span className="text-xs text-zinc-500">{urls.length} valid URL{urls.length !== 1 ? 's' : ''}</span>
        </div>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={'https://example.com\nhttps://example.org\nhttps://example.net'}
          className="flex-1 min-h-[150px] bg-surface-100 border border-border rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors resize-none"
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {loading ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2.5 bg-status-error text-white font-medium text-sm rounded-xl hover:bg-status-error/90 transition-colors cursor-pointer"
          >
            <Square size={15} />
            Stop
          </button>
        ) : (
          <button
            onClick={handleBulkScrape}
            disabled={urls.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-surface font-medium text-sm rounded-xl hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Play size={15} />
            Scrape All ({urls.length})
          </button>
        )}

        {results.length > 0 && (
          <>
            <button
              onClick={handleExportAll}
              disabled={successCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-200 text-zinc-300 font-medium text-sm rounded-xl hover:bg-surface-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Download size={15} />
              Export
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-200 text-zinc-300 font-medium text-sm rounded-xl hover:bg-surface-300 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              Clear
            </button>
          </>
        )}
      </div>

      {/* Progress */}
      {loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-300 font-mono">{progress.current} / {progress.total}</span>
          </div>
          <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Results</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-status-success">
                <CheckCircle2 size={12} />
                {successCount}
              </span>
              <span className="flex items-center gap-1 text-status-error">
                <XCircle size={12} />
                {errorCount}
              </span>
            </div>
          </div>

          <div className="max-h-[300px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-100">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">URL</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface-100 transition-colors">
                    <td className="py-2 px-3">
                      {r.status === 'success' ? (
                        <span className="flex items-center gap-1.5 text-status-success">
                          <CheckCircle2 size={14} />
                          {r.response?.status}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-status-error">
                          <XCircle size={14} />
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-zinc-400 max-w-[300px] truncate" title={r.url}>
                      {r.url}
                    </td>
                    <td className="py-2 px-3">
                      {r.response?.elapsed && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock size={12} />
                          {r.response.elapsed}s
                        </span>
                      )}
                      {r.error && (
                        <span className="text-xs text-status-error" title={r.error}>
                          {r.error.slice(0, 30)}...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Clock, Copy, Check, FileText, Code, Globe, Cookie } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import StatusBadge from './StatusBadge'
import type { ScrapeResponse, ScrapeError, ExtractionType } from '../types'

type ResponseTab = 'content' | 'headers' | 'cookies' | 'raw'

interface Props {
  response: ScrapeResponse | null
  error: ScrapeError | null
  loading: boolean
  extractionType: ExtractionType
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-surface-200 transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
    </button>
  )
}

function KeyValueTable({ data, emptyMessage }: { data: Record<string, string>; emptyMessage: string }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-600 py-8 text-center">{emptyMessage}</p>
  }
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400 uppercase tracking-wider w-1/3">Key</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-border/50 hover:bg-surface-100 transition-colors">
              <td className="py-2 px-3 font-mono text-accent text-xs">{key}</td>
              <td className="py-2 px-3 font-mono text-zinc-400 text-xs break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ResponsePanel({ response, error, loading, extractionType }: Props) {
  const [tab, setTab] = useState<ResponseTab>('content')

  const tabs: { id: ResponseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'content', label: 'Content', icon: <FileText size={14} /> },
    { id: 'headers', label: 'Headers', icon: <Code size={14} /> },
    { id: 'cookies', label: 'Cookies', icon: <Cookie size={14} /> },
    { id: 'raw', label: 'Raw', icon: <Globe size={14} /> },
  ]

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-surface-100 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-zinc-400">Response</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Scraping...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-surface-100 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-status-error">Error</span>
          {error.elapsed !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={12} />
              {error.elapsed}s
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4">
            <p className="text-sm text-status-error font-medium mb-2">{error.error}</p>
            {error.traceback && (
              <pre className="text-xs text-zinc-500 font-mono whitespace-pre-wrap mt-3 pt-3 border-t border-status-error/20">
                {error.traceback}
              </pre>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!response) {
    return (
      <div className="flex-1 flex flex-col bg-surface-100 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-zinc-400">Response</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <Globe size={32} className="text-zinc-700" />
            <p className="text-sm text-zinc-500">Enter a URL and hit Scrape to get started</p>
          </div>
        </div>
      </div>
    )
  }

  // Response state
  return (
    <div className="flex-1 flex flex-col bg-surface-100 rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <StatusBadge status={response.status} reason={response.reason} />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={12} />
            {response.elapsed}s
          </div>
        </div>
        <CopyButton text={response.content} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer
              ${tab === t.id
                ? 'text-accent border-b-2 border-accent -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            {t.icon}
            {t.label}
            {t.id === 'headers' && (
              <span className="ml-1 px-1.5 py-0.5 bg-surface-300 rounded text-[10px] text-zinc-500">
                {Object.keys(response.headers).length}
              </span>
            )}
            {t.id === 'cookies' && (
              <span className="ml-1 px-1.5 py-0.5 bg-surface-300 rounded text-[10px] text-zinc-500">
                {Object.keys(response.cookies).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'content' && (
          <div className="p-4">
            {extractionType === 'markdown' ? (
              <div className="markdown-content">
                <ReactMarkdown>{response.content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {response.content}
              </pre>
            )}
          </div>
        )}
        {tab === 'headers' && (
          <KeyValueTable data={response.headers} emptyMessage="No response headers" />
        )}
        {tab === 'cookies' && (
          <KeyValueTable data={response.cookies} emptyMessage="No cookies" />
        )}
        {tab === 'raw' && (
          <div className="p-4">
            <pre className="text-xs font-mono text-zinc-500 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

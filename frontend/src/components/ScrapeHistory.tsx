import { Clock, Trash2, RotateCcw, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { ScrapeHistoryItem } from '../types'

interface Props {
  history: ScrapeHistoryItem[]
  onRestore: (item: ScrapeHistoryItem) => void
  onClear: () => void
  onRemove: (id: string) => void
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getMethodColor(method: string): string {
  switch (method.toLowerCase()) {
    case 'get': return 'text-status-success'
    case 'post': return 'text-amber-400'
    case 'put': return 'text-blue-400'
    case 'delete': return 'text-status-error'
    default: return 'text-zinc-400'
  }
}

function getStatusIcon(status: number) {
  if (status >= 200 && status < 300) {
    return <CheckCircle2 size={14} className="text-status-success" />
  }
  return <XCircle size={14} className="text-status-error" />
}

export default function ScrapeHistory({ history, onRestore, onClear, onRemove }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock size={32} className="text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500">No scrape history yet</p>
        <p className="text-xs text-zinc-600 mt-1">Your recent scrapes will appear here</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          History ({history.length})
        </span>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-status-error rounded-md hover:bg-status-error/10 transition-colors cursor-pointer"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-surface-50 transition-colors group"
          >
            {/* Status & Method */}
            <div className="flex items-center gap-2 shrink-0">
              {getStatusIcon(item.status)}
              <span className={`text-xs font-mono font-medium uppercase ${getMethodColor(item.method)}`}>
                {item.method}
              </span>
            </div>

            {/* URL & Meta */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate" title={item.url}>
                {item.url}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                <span className="capitalize">{item.fetcher_type}</span>
                <span>{item.elapsed}s</span>
                <span>{formatTimestamp(item.timestamp)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRestore(item)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover rounded-md hover:bg-accent-muted transition-colors cursor-pointer"
                title="Restore this request"
              >
                <RotateCcw size={12} />
                Restore
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 text-zinc-600 hover:text-status-error rounded-md hover:bg-status-error/10 transition-colors cursor-pointer"
                title="Remove from history"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <ChevronRight size={14} className="text-zinc-700 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

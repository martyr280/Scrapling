import { Plus, X } from 'lucide-react'
import type { HeaderPair } from '../types'

interface Props {
  headers: HeaderPair[]
  onChange: (headers: HeaderPair[]) => void
  label?: string
}

export default function HeaderEditor({ headers, onChange, label = 'Headers' }: Props) {
  const addPair = () => {
    onChange([...headers, { key: '', value: '', id: crypto.randomUUID() }])
  }

  const removePair = (id: string) => {
    onChange(headers.filter((h) => h.id !== id))
  }

  const updatePair = (id: string, field: 'key' | 'value', val: string) => {
    onChange(headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
        <button
          onClick={addPair}
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover rounded-md hover:bg-accent-muted transition-colors cursor-pointer"
        >
          <Plus size={12} />
          Add
        </button>
      </div>
      {headers.length === 0 ? (
        <p className="text-xs text-zinc-600 py-3 text-center">
          No {label.toLowerCase()} added
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {headers.map((h) => (
            <div key={h.id} className="flex items-center gap-2">
              <input
                type="text"
                value={h.key}
                onChange={(e) => updatePair(h.id, 'key', e.target.value)}
                placeholder="Key"
                className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) => updatePair(h.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={() => removePair(h.id)}
                className="p-1.5 text-zinc-600 hover:text-status-error rounded-md hover:bg-status-error/10 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

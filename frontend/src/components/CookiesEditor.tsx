import { useState } from 'react'
import { Plus, X, FileText } from 'lucide-react'

interface CookiePair {
  key: string
  value: string
  id: string
}

interface Props {
  cookies: CookiePair[]
  onChange: (cookies: CookiePair[]) => void
}

export default function CookiesEditor({ cookies, onChange }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [importValue, setImportValue] = useState('')

  const addPair = () => {
    onChange([...cookies, { key: '', value: '', id: crypto.randomUUID() }])
  }

  const removePair = (id: string) => {
    onChange(cookies.filter((c) => c.id !== id))
  }

  const updatePair = (id: string, field: 'key' | 'value', val: string) => {
    onChange(cookies.map((c) => (c.id === id ? { ...c, [field]: val } : c)))
  }

  const handleImport = () => {
    if (!importValue.trim()) return

    // Parse cookie string format: "name1=value1; name2=value2"
    const newCookies: CookiePair[] = []
    const pairs = importValue.split(';')
    
    for (const pair of pairs) {
      const trimmed = pair.trim()
      if (!trimmed) continue
      
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      
      const key = trimmed.substring(0, eqIndex).trim()
      const value = trimmed.substring(eqIndex + 1).trim()
      
      if (key) {
        newCookies.push({ key, value, id: crypto.randomUUID() })
      }
    }

    if (newCookies.length > 0) {
      onChange([...cookies, ...newCookies])
      setImportValue('')
      setShowImport(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cookies</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowImport(!showImport)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              showImport ? 'text-accent bg-accent-muted' : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-200'
            }`}
            title="Import from cookie string"
          >
            <FileText size={12} />
            Import
          </button>
          <button
            onClick={addPair}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover rounded-md hover:bg-accent-muted transition-colors cursor-pointer"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Import dialog */}
      {showImport && (
        <div className="flex flex-col gap-2 p-3 bg-surface-50 rounded-lg border border-border">
          <label className="text-xs text-zinc-400">Paste cookie string (e.g., from browser DevTools)</label>
          <textarea
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
            placeholder="name1=value1; name2=value2; ..."
            rows={2}
            className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowImport(false)
                setImportValue('')
              }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!importValue.trim()}
              className="px-3 py-1.5 text-xs text-surface bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {/* Cookie pairs */}
      {cookies.length === 0 ? (
        <p className="text-xs text-zinc-600 py-3 text-center">
          No cookies added
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {cookies.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="text"
                value={c.key}
                onChange={(e) => updatePair(c.id, 'key', e.target.value)}
                placeholder="Name"
                className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <input
                type="text"
                value={c.value}
                onChange={(e) => updatePair(c.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={() => removePair(c.id)}
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

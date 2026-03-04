import { useState } from 'react'
import { Plus, Trash2, Shield, RefreshCw } from 'lucide-react'
import type { ProxyConfig, ProxyProtocol, RotationStrategy } from '../types'

interface Props {
  config: ProxyConfig
  onChange: (config: ProxyConfig) => void
}

const PROTOCOLS: { value: ProxyProtocol; label: string }[] = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
]

const STRATEGIES: { value: RotationStrategy; label: string; description: string }[] = [
  { value: 'round-robin', label: 'Round Robin', description: 'Cycle through proxies in order' },
  { value: 'random', label: 'Random', description: 'Select proxies randomly' },
  { value: 'least-used', label: 'Least Used', description: 'Prioritize less-used proxies' },
]

function Toggle({ label, checked, onChange, description }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <div className="flex flex-col">
        <span className="text-sm text-zinc-300 group-hover:text-zinc-200 transition-colors">{label}</span>
        {description && <span className="text-xs text-zinc-600">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer
          ${checked ? 'bg-accent' : 'bg-surface-300'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  )
}

export default function ProxyManager({ config, onChange }: Props) {
  const [proxyInput, setProxyInput] = useState('')

  const handleAddProxy = () => {
    if (!proxyInput.trim()) return
    
    // Parse multiple proxies (one per line or comma-separated)
    const newProxies = proxyInput
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p && !config.proxies.includes(p))

    if (newProxies.length > 0) {
      onChange({
        ...config,
        proxies: [...config.proxies, ...newProxies],
      })
      setProxyInput('')
    }
  }

  const handleRemoveProxy = (index: number) => {
    onChange({
      ...config,
      proxies: config.proxies.filter((_, i) => i !== index),
    })
  }

  const handleClearAll = () => {
    onChange({
      ...config,
      proxies: [],
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-accent" />
        <span className="text-sm font-medium text-zinc-300">Proxy Rotation</span>
      </div>

      {/* Enable Toggle */}
      <Toggle
        label="Enable Proxy Rotation"
        checked={config.enabled}
        onChange={(v) => onChange({ ...config, enabled: v })}
        description="Rotate through multiple proxies for requests"
      />

      {config.enabled && (
        <>
          {/* Protocol */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Protocol</label>
            <div className="flex gap-1">
              {PROTOCOLS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onChange({ ...config, protocol: p.value })}
                  className={`
                    flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer
                    ${config.protocol === p.value
                      ? 'bg-accent text-surface'
                      : 'bg-surface-200 text-zinc-400 hover:text-zinc-300 hover:bg-surface-300'
                    }
                  `}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Strategy */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Rotation Strategy</label>
            {STRATEGIES.map((s) => (
              <label
                key={s.value}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${config.rotation_strategy === s.value
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-border/80 hover:bg-surface-50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="rotation_strategy"
                  value={s.value}
                  checked={config.rotation_strategy === s.value}
                  onChange={() => onChange({ ...config, rotation_strategy: s.value })}
                  className="mt-0.5 accent-accent"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-300">{s.label}</span>
                  <span className="text-xs text-zinc-600">{s.description}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Proxy List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Proxies ({config.proxies.length})
              </label>
              {config.proxies.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-status-error rounded-md hover:bg-status-error/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              )}
            </div>

            {/* Add proxy input */}
            <div className="flex gap-2">
              <textarea
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                placeholder={'host:port\nuser:pass@host:port'}
                rows={2}
                className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
              <button
                onClick={handleAddProxy}
                disabled={!proxyInput.trim()}
                className="px-3 py-2 bg-accent text-surface font-medium text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer self-start"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Proxy list */}
            {config.proxies.length > 0 && (
              <div className="flex flex-col gap-1 max-h-40 overflow-auto">
                {config.proxies.map((proxy, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-50 rounded-lg group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RefreshCw size={12} className="text-zinc-600 shrink-0" />
                      <span className="text-sm font-mono text-zinc-400 truncate">{proxy}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveProxy(index)}
                      className="p-1 text-zinc-600 hover:text-status-error rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {config.proxies.length === 0 && (
              <p className="text-xs text-zinc-600 py-2 text-center">
                No proxies added. Add proxies one per line.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

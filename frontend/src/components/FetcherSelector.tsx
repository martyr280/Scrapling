import { Globe, Monitor, Shield } from 'lucide-react'
import type { FetcherType } from '../types'

const fetchers = [
  {
    id: 'fetcher' as FetcherType,
    name: 'Fetcher',
    description: 'Fast HTTP requests via curl_cffi',
    icon: Globe,
    tags: ['GET', 'POST', 'PUT', 'DELETE'],
    speed: 3,
    stealth: 1,
  },
  {
    id: 'dynamic' as FetcherType,
    name: 'DynamicFetcher',
    description: 'Browser-based via Playwright',
    icon: Monitor,
    tags: ['JS Rendering', 'Dynamic'],
    speed: 2,
    stealth: 2,
  },
  {
    id: 'stealthy' as FetcherType,
    name: 'StealthyFetcher',
    description: 'Anti-bot evasion via Camoufox',
    icon: Shield,
    tags: ['Cloudflare', 'Anti-Bot'],
    speed: 1,
    stealth: 3,
  },
]

function RatingDots({ count, max = 3, color }: { count: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors"
          style={{ backgroundColor: i < count ? color : '#2a2a3e' }}
        />
      ))}
    </div>
  )
}

interface Props {
  selected: FetcherType
  onChange: (type: FetcherType) => void
}

export default function FetcherSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {fetchers.map((f) => {
        const isSelected = selected === f.id
        const Icon = f.icon
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`
              flex-1 flex flex-col gap-2.5 p-4 rounded-xl border transition-all text-left cursor-pointer
              ${isSelected
                ? 'border-accent bg-accent-muted'
                : 'border-border bg-surface-100 hover:border-border-hover hover:bg-surface-200'
              }
            `}
          >
            <div className="flex items-center gap-2.5">
              <div className={`
                p-1.5 rounded-lg
                ${isSelected ? 'bg-accent/20 text-accent' : 'bg-surface-300 text-zinc-400'}
              `}>
                <Icon size={16} />
              </div>
              <span className={`font-mono text-sm font-medium ${isSelected ? 'text-accent' : 'text-zinc-300'}`}>
                {f.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">Speed</span>
                <RatingDots count={f.speed} color="#22c55e" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">Stealth</span>
                <RatingDots count={f.stealth} color="#22d3ee" />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

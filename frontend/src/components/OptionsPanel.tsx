import type { ScrapeRequest, FetcherType } from '../types'

interface Props {
  request: ScrapeRequest
  onChange: (updates: Partial<ScrapeRequest>) => void
}

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

function NumberInput({ label, value, onChange, min, max, description }: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">{label}</label>
      {description && <span className="text-xs text-zinc-600">{description}</span>}
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        min={min}
        max={max}
        className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors w-full"
      />
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, description }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">{label}</label>
      {description && <span className="text-xs text-zinc-600">{description}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors w-full"
      />
    </div>
  )
}

function SelectInput({ label, value, onChange, options, description }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">{label}</label>
      {description && <span className="text-xs text-zinc-600">{description}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-300 focus:outline-none focus:border-accent/50 transition-colors w-full appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FetcherOptions({ request, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="Impersonate"
        value={request.impersonate}
        onChange={(v) => onChange({ impersonate: v })}
        options={[
          { label: 'Chrome', value: 'chrome' },
          { label: 'Firefox', value: 'firefox' },
          { label: 'Safari', value: 'safari' },
          { label: 'Edge', value: 'edge' },
        ]}
        description="Browser fingerprint to impersonate"
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="Timeout (s)" value={request.timeout} onChange={(v) => onChange({ timeout: v ?? 30 })} min={1} max={300} />
        <NumberInput label="Retries" value={request.retries} onChange={(v) => onChange({ retries: v ?? 3 })} min={0} max={10} />
      </div>
      <NumberInput label="Retry Delay (s)" value={request.retry_delay} onChange={(v) => onChange({ retry_delay: v ?? 1 })} min={0} max={30} />
      <TextInput label="Proxy" value={request.proxy} onChange={(v) => onChange({ proxy: v })} placeholder="http://user:pass@host:port" />
      <div className="flex flex-col gap-3 pt-2 border-t border-border">
        <Toggle label="Follow Redirects" checked={request.follow_redirects} onChange={(v) => onChange({ follow_redirects: v })} />
        <Toggle label="HTTP/3" checked={request.http3} onChange={(v) => onChange({ http3: v })} description="May conflict with impersonate" />
        <Toggle label="Stealthy Headers" checked={request.stealthy_headers} onChange={(v) => onChange({ stealthy_headers: v })} description="Add realistic browser headers" />
      </div>
    </div>
  )
}

function DynamicOptions({ request, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <NumberInput label="Timeout (ms)" value={request.timeout} onChange={(v) => onChange({ timeout: v ?? 30000 })} min={1000} max={300000} />
      <NumberInput label="Wait (ms)" value={request.wait} onChange={(v) => onChange({ wait: v })} min={0} description="Extra time to wait after page load" />
      <TextInput label="Wait for Selector" value={request.wait_selector} onChange={(v) => onChange({ wait_selector: v })} placeholder="CSS selector to wait for" description="Wait until this element appears" />
      <TextInput label="Proxy" value={request.proxy} onChange={(v) => onChange({ proxy: v })} placeholder="http://user:pass@host:port" />
      <div className="flex flex-col gap-3 pt-2 border-t border-border">
        <Toggle label="Headless" checked={request.headless} onChange={(v) => onChange({ headless: v })} description="Run browser without visible window" />
        <Toggle label="Network Idle" checked={request.network_idle} onChange={(v) => onChange({ network_idle: v })} description="Wait for network to be idle" />
        <Toggle label="Disable Resources" checked={request.disable_resources} onChange={(v) => onChange({ disable_resources: v })} description="Block images, CSS, fonts" />
        <Toggle label="Google Search" checked={request.google_search} onChange={(v) => onChange({ google_search: v })} description="Navigate via Google search first" />
      </div>
    </div>
  )
}

function StealthyOptions({ request, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <NumberInput label="Timeout (ms)" value={request.timeout} onChange={(v) => onChange({ timeout: v ?? 30000 })} min={1000} max={300000} />
      <NumberInput label="Wait (ms)" value={request.wait} onChange={(v) => onChange({ wait: v })} min={0} description="Extra time to wait after page load" />
      <TextInput label="Wait for Selector" value={request.wait_selector} onChange={(v) => onChange({ wait_selector: v })} placeholder="CSS selector to wait for" />
      <TextInput label="Proxy" value={request.proxy} onChange={(v) => onChange({ proxy: v })} placeholder="http://user:pass@host:port" />
      <div className="flex flex-col gap-3 pt-2 border-t border-border">
        <Toggle label="Headless" checked={request.headless} onChange={(v) => onChange({ headless: v })} description="Run browser without visible window" />
        <Toggle label="Network Idle" checked={request.network_idle} onChange={(v) => onChange({ network_idle: v })} />
        <Toggle label="Disable Resources" checked={request.disable_resources} onChange={(v) => onChange({ disable_resources: v })} />
        <Toggle label="Google Search" checked={request.google_search} onChange={(v) => onChange({ google_search: v })} />
      </div>
      <div className="flex flex-col gap-3 pt-2 border-t border-border">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Anti-Bot Options</span>
        <Toggle label="Solve Cloudflare" checked={request.solve_cloudflare} onChange={(v) => onChange({ solve_cloudflare: v })} description="Auto-solve Cloudflare challenges" />
        <Toggle label="Hide Canvas" checked={request.hide_canvas} onChange={(v) => onChange({ hide_canvas: v })} description="Spoof canvas fingerprint" />
        <Toggle label="Block WebRTC" checked={request.block_webrtc} onChange={(v) => onChange({ block_webrtc: v })} description="Prevent IP leak via WebRTC" />
        <Toggle label="Allow WebGL" checked={request.allow_webgl} onChange={(v) => onChange({ allow_webgl: v })} description="Enable WebGL rendering" />
      </div>
    </div>
  )
}

const optionPanels: Record<FetcherType, React.FC<Props>> = {
  fetcher: FetcherOptions,
  dynamic: DynamicOptions,
  stealthy: StealthyOptions,
}

export default function OptionsPanel(props: Props) {
  const Panel = optionPanels[props.request.fetcher_type]
  return <Panel {...props} />
}

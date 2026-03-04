import type { ScrapeRequest, WaitSelectorState } from '../types'

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

function SelectInput<T extends string>({ label, value, onChange, options, description }: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">{label}</label>
      {description && <span className="text-xs text-zinc-600">{description}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
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

export default function AdvancedOptions({ request, onChange }: Props) {
  const showBrowserOptions = request.fetcher_type === 'dynamic' || request.fetcher_type === 'stealthy'

  return (
    <div className="flex flex-col gap-4 pt-3 border-t border-border">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Advanced Options</span>

      {/* SSL & Security */}
      <Toggle
        label="Verify SSL"
        checked={request.verify_ssl}
        onChange={(v) => onChange({ verify_ssl: v })}
        description="Verify SSL certificates"
      />

      {/* Network */}
      <NumberInput
        label="Max Redirects"
        value={request.max_redirects}
        onChange={(v) => onChange({ max_redirects: v ?? 10 })}
        min={0}
        max={50}
        description="Maximum number of redirects to follow"
      />

      {/* User Agent */}
      <TextInput
        label="User Agent"
        value={request.useragent}
        onChange={(v) => onChange({ useragent: v })}
        placeholder="Custom user agent string"
        description="Override default browser user agent"
      />

      {/* Browser-specific options */}
      {showBrowserOptions && (
        <>
          <div className="h-px bg-border" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Browser Options</span>

          <SelectInput<WaitSelectorState>
            label="Wait Selector State"
            value={request.wait_selector_state}
            onChange={(v) => onChange({ wait_selector_state: v })}
            options={[
              { label: 'Visible', value: 'visible' },
              { label: 'Hidden', value: 'hidden' },
              { label: 'Attached', value: 'attached' },
              { label: 'Detached', value: 'detached' },
            ]}
            description="State to wait for when using wait selector"
          />

          <TextInput
            label="Locale"
            value={request.locale}
            onChange={(v) => onChange({ locale: v })}
            placeholder="en-US"
            description="Browser locale for content negotiation"
          />

          <TextInput
            label="Timezone ID"
            value={request.timezone_id}
            onChange={(v) => onChange({ timezone_id: v })}
            placeholder="America/New_York"
            description="Override browser timezone"
          />

          {request.fetcher_type === 'stealthy' && (
            <>
              <Toggle
                label="Real Chrome"
                checked={request.real_chrome}
                onChange={(v) => onChange({ real_chrome: v })}
                description="Use real Chrome installation instead of bundled"
              />

              <TextInput
                label="CDP URL"
                value={request.cdp_url}
                onChange={(v) => onChange({ cdp_url: v })}
                placeholder="ws://localhost:9222"
                description="Connect to existing Chrome DevTools Protocol"
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

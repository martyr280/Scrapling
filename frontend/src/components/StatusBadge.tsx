interface Props {
  status: number
  reason: string
}

export default function StatusBadge({ status, reason }: Props) {
  const color =
    status >= 200 && status < 300
      ? 'bg-status-success/15 text-status-success border-status-success/30'
      : status >= 300 && status < 400
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : status >= 400 && status < 500
          ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
          : 'bg-status-error/15 text-status-error border-status-error/30'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-sm font-medium ${color}`}>
      {status}
      <span className="text-xs opacity-70 font-normal">{reason}</span>
    </span>
  )
}

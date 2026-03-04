import { useState, useEffect } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import type { BodyType } from '../types'

interface Props {
  bodyType: BodyType
  bodyContent: string
  onTypeChange: (type: BodyType) => void
  onContentChange: (content: string) => void
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form' },
  { value: 'raw', label: 'Raw' },
]

function isValidJson(str: string): boolean {
  if (!str.trim()) return true
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

export default function BodyEditor({ bodyType, bodyContent, onTypeChange, onContentChange }: Props) {
  const [jsonValid, setJsonValid] = useState(true)

  useEffect(() => {
    if (bodyType === 'json') {
      setJsonValid(isValidJson(bodyContent))
    } else {
      setJsonValid(true)
    }
  }, [bodyType, bodyContent])

  const getPlaceholder = () => {
    switch (bodyType) {
      case 'json':
        return '{\n  "key": "value"\n}'
      case 'form':
        return 'key1=value1&key2=value2'
      case 'raw':
        return 'Raw body content...'
      default:
        return ''
    }
  }

  const formatJson = () => {
    if (bodyType === 'json' && bodyContent.trim()) {
      try {
        const parsed = JSON.parse(bodyContent)
        onContentChange(JSON.stringify(parsed, null, 2))
      } catch {
        // Invalid JSON, do nothing
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Request Body</span>
        {bodyType === 'json' && (
          <div className="flex items-center gap-2">
            {bodyContent.trim() && (
              <span className={`flex items-center gap-1 text-xs ${jsonValid ? 'text-status-success' : 'text-status-error'}`}>
                {jsonValid ? <Check size={12} /> : <AlertCircle size={12} />}
                {jsonValid ? 'Valid' : 'Invalid'}
              </span>
            )}
            <button
              onClick={formatJson}
              disabled={!jsonValid || !bodyContent.trim()}
              className="px-2 py-1 text-xs text-accent hover:text-accent-hover disabled:text-zinc-600 disabled:cursor-not-allowed rounded-md hover:bg-accent-muted transition-colors cursor-pointer"
            >
              Format
            </button>
          </div>
        )}
      </div>

      {/* Body type selector */}
      <div className="flex gap-1">
        {BODY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onTypeChange(type.value)}
            className={`
              flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer
              ${bodyType === type.value
                ? 'bg-accent text-surface'
                : 'bg-surface-200 text-zinc-400 hover:text-zinc-300 hover:bg-surface-300'
              }
            `}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Body content editor */}
      {bodyType !== 'none' && (
        <textarea
          value={bodyContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={getPlaceholder()}
          rows={6}
          className={`
            w-full bg-surface-50 border rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 
            placeholder:text-zinc-600 focus:outline-none transition-colors resize-y min-h-[100px]
            ${bodyType === 'json' && !jsonValid && bodyContent.trim()
              ? 'border-status-error focus:border-status-error'
              : 'border-border focus:border-accent/50'
            }
          `}
        />
      )}

      {bodyType === 'form' && (
        <span className="text-[11px] text-zinc-600">
          Use key=value pairs separated by {'&'}
        </span>
      )}
    </div>
  )
}

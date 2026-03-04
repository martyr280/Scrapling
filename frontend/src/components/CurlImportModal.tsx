import { useState, useCallback } from 'react'
import { X, FileCode, AlertCircle } from 'lucide-react'
import type { ParsedCurl, HttpMethod, BodyType, HeaderPair } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImport: (parsed: ParsedCurl, headerPairs: HeaderPair[], cookiePairs: HeaderPair[]) => void
}

function parseCurlCommand(curlStr: string): ParsedCurl | null {
  try {
    const trimmed = curlStr.trim()
    if (!trimmed.toLowerCase().startsWith('curl')) {
      return null
    }

    const result: ParsedCurl = {
      url: '',
      method: 'get',
      headers: {},
      cookies: {},
      body: '',
      body_type: 'none',
    }

    // Remove line continuations and normalize
    const normalized = trimmed
      .replace(/\\\r?\n/g, ' ')
      .replace(/\s+/g, ' ')

    // Extract URL (handle both quoted and unquoted)
    const urlMatch = normalized.match(/curl\s+(?:-[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i)
      || normalized.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/)
    
    if (urlMatch) {
      result.url = urlMatch[1].replace(/['"]/g, '')
    }

    // Extract method (-X or --request)
    const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/i)
      || normalized.match(/--request\s+['"]?(\w+)['"]?/i)
    
    if (methodMatch) {
      result.method = methodMatch[1].toLowerCase() as HttpMethod
    }

    // Extract headers (-H or --header)
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi
    let headerMatch
    while ((headerMatch = headerRegex.exec(normalized)) !== null) {
      const headerLine = headerMatch[1]
      const colonIndex = headerLine.indexOf(':')
      if (colonIndex !== -1) {
        const key = headerLine.substring(0, colonIndex).trim()
        const value = headerLine.substring(colonIndex + 1).trim()
        
        // Handle Cookie header specially
        if (key.toLowerCase() === 'cookie') {
          const cookiePairs = value.split(';')
          for (const pair of cookiePairs) {
            const eqIndex = pair.indexOf('=')
            if (eqIndex !== -1) {
              const cookieKey = pair.substring(0, eqIndex).trim()
              const cookieValue = pair.substring(eqIndex + 1).trim()
              result.cookies[cookieKey] = cookieValue
            }
          }
        } else {
          result.headers[key] = value
        }
      }
    }

    // Extract body data (-d, --data, --data-raw, --data-binary)
    const dataMatch = normalized.match(/(?:-d|--data(?:-raw|-binary)?)\s+['"]([^'"]+)['"]/i)
      || normalized.match(/(?:-d|--data(?:-raw|-binary)?)\s+([^\s]+)/i)
    
    if (dataMatch) {
      result.body = dataMatch[1]
      
      // Determine body type
      if (result.body.startsWith('{') || result.body.startsWith('[')) {
        result.body_type = 'json'
      } else if (result.body.includes('=')) {
        result.body_type = 'form'
      } else {
        result.body_type = 'raw'
      }

      // If POST/PUT without explicit method, set it
      if (result.method === 'get' && result.body) {
        result.method = 'post'
      }
    }

    // Extract cookies from -b or --cookie
    const cookieMatch = normalized.match(/(?:-b|--cookie)\s+['"]([^'"]+)['"]/i)
    if (cookieMatch) {
      const cookiePairs = cookieMatch[1].split(';')
      for (const pair of cookiePairs) {
        const eqIndex = pair.indexOf('=')
        if (eqIndex !== -1) {
          const key = pair.substring(0, eqIndex).trim()
          const value = pair.substring(eqIndex + 1).trim()
          result.cookies[key] = value
        }
      }
    }

    return result.url ? result : null
  } catch {
    return null
  }
}

export default function CurlImportModal({ isOpen, onClose, onImport }: Props) {
  const [curlCommand, setCurlCommand] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedCurl | null>(null)

  const handleParse = useCallback(() => {
    setError(null)
    const parsed = parseCurlCommand(curlCommand)
    
    if (!parsed) {
      setError('Could not parse curl command. Make sure it starts with "curl" and includes a valid URL.')
      setPreview(null)
      return
    }

    setPreview(parsed)
  }, [curlCommand])

  const handleImport = useCallback(() => {
    if (!preview) return

    // Convert headers and cookies to pairs format
    const headerPairs: HeaderPair[] = Object.entries(preview.headers).map(([key, value]) => ({
      key,
      value,
      id: crypto.randomUUID(),
    }))

    const cookiePairs: HeaderPair[] = Object.entries(preview.cookies).map(([key, value]) => ({
      key,
      value,
      id: crypto.randomUUID(),
    }))

    onImport(preview, headerPairs, cookiePairs)
    handleClose()
  }, [preview, onImport])

  const handleClose = useCallback(() => {
    setCurlCommand('')
    setError(null)
    setPreview(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-surface-100 rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-accent/10 rounded-lg">
              <FileCode size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Import from cURL</h2>
              <p className="text-xs text-zinc-500">Paste a curl command to auto-fill request options</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              cURL Command
            </label>
            <textarea
              value={curlCommand}
              onChange={(e) => {
                setCurlCommand(e.target.value)
                setError(null)
                setPreview(null)
              }}
              placeholder={'curl -X GET "https://api.example.com/data" \\\n  -H "Authorization: Bearer token" \\\n  -H "Content-Type: application/json"'}
              rows={6}
              className="w-full bg-surface-50 border border-border rounded-lg px-4 py-3 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
              <AlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          {preview && (
            <div className="flex flex-col gap-3 p-4 bg-surface-50 rounded-lg border border-border">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Preview</span>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-500">Method:</span>
                  <span className="ml-2 font-mono text-accent uppercase">{preview.method}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Body Type:</span>
                  <span className="ml-2 font-mono text-zinc-300">{preview.body_type}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-500 text-sm">URL:</span>
                <p className="font-mono text-xs text-zinc-300 mt-1 break-all">{preview.url}</p>
              </div>

              {Object.keys(preview.headers).length > 0 && (
                <div>
                  <span className="text-zinc-500 text-sm">Headers ({Object.keys(preview.headers).length}):</span>
                  <div className="mt-1 text-xs font-mono text-zinc-400 max-h-20 overflow-auto">
                    {Object.entries(preview.headers).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-accent">{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(preview.cookies).length > 0 && (
                <div>
                  <span className="text-zinc-500 text-sm">Cookies ({Object.keys(preview.cookies).length}):</span>
                  <div className="mt-1 text-xs font-mono text-zinc-400">
                    {Object.entries(preview.cookies).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-accent">{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.body && (
                <div>
                  <span className="text-zinc-500 text-sm">Body:</span>
                  <pre className="mt-1 text-xs font-mono text-zinc-400 max-h-20 overflow-auto whitespace-pre-wrap">
                    {preview.body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {preview ? (
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-surface bg-accent hover:bg-accent-hover rounded-lg transition-colors cursor-pointer"
            >
              Import
            </button>
          ) : (
            <button
              onClick={handleParse}
              disabled={!curlCommand.trim()}
              className="px-4 py-2 text-sm font-medium text-surface bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              Parse
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

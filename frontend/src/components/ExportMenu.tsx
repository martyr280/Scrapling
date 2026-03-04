import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Code, FileJson, FileType } from 'lucide-react'
import type { ScrapeResponse } from '../types'

interface Props {
  response: ScrapeResponse
}

type ExportFormat = 'html' | 'markdown' | 'text' | 'json'

const EXPORT_OPTIONS: { format: ExportFormat; label: string; icon: React.ReactNode; ext: string }[] = [
  { format: 'html', label: 'HTML', icon: <Code size={14} />, ext: '.html' },
  { format: 'markdown', label: 'Markdown', icon: <FileText size={14} />, ext: '.md' },
  { format: 'text', label: 'Plain Text', icon: <FileType size={14} />, ext: '.txt' },
  { format: 'json', label: 'JSON', icon: <FileJson size={14} />, ext: '.json' },
]

function getFilename(url: string, ext: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/\./g, '-')
    const timestamp = new Date().toISOString().slice(0, 10)
    return `${hostname}-${timestamp}${ext}`
  } catch {
    return `scrape-${Date.now()}${ext}`
  }
}

function prepareContent(response: ScrapeResponse, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify({
        url: response.url,
        status: response.status,
        reason: response.reason,
        content: response.content,
        headers: response.headers,
        cookies: response.cookies,
        elapsed: response.elapsed,
        exportedAt: new Date().toISOString(),
      }, null, 2)
    case 'html':
      // Wrap in basic HTML structure if content doesn't have html/body tags
      if (response.content.includes('<html') || response.content.includes('<!DOCTYPE')) {
        return response.content
      }
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scraped from ${response.url}</title>
</head>
<body>
${response.content}
</body>
</html>`
    case 'markdown':
    case 'text':
    default:
      return response.content
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ExportMenu({ response }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleExport = (format: ExportFormat, ext: string) => {
    const content = prepareContent(response, format)
    const filename = getFilename(response.url, ext)
    
    const mimeTypes: Record<ExportFormat, string> = {
      html: 'text/html',
      markdown: 'text/markdown',
      text: 'text/plain',
      json: 'application/json',
    }

    downloadFile(content, filename, mimeTypes[format])
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
      >
        <Download size={14} />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 py-1 bg-surface-100 border border-border rounded-lg shadow-xl z-10">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format, option.ext)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-surface-200 transition-colors cursor-pointer"
            >
              {option.icon}
              <span>{option.label}</span>
              <span className="ml-auto text-xs text-zinc-600">{option.ext}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

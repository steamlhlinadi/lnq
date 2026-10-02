import { useState, useEffect, useRef, useCallback } from 'react'
import { Printer, Sparkles, Trash2, ChevronRight, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { parseAddresses } from '@/lib/parser'
import { groqNormalizeOne } from '@/lib/groq'
import { buildPrintHTML } from '@/lib/printBuilder'
import type { AddressEntry, PrintSizes } from '@/types'
import { cn } from '@/lib/utils'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted border-b border-[#2a2a2a] pb-1.5">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  )
}

function ParsedCard({ entry, index, onUpdate }: {
  entry: AddressEntry
  index: number
  onUpdate: (index: number, updated: AddressEntry) => void
}) {
  const update = (field: keyof AddressEntry, value: string | string[]) => {
    onUpdate(index, { ...entry, [field]: value })
  }

    return (
      <div className={cn(
        'relative bg-[#0f0f0f] border rounded-md px-3 py-2.5 text-xs leading-relaxed',
        entry.groqEnhanced ? 'border-[#4a2a9a]' : 'border-[#2a2a2a]'
      )}>
        {entry.groqEnhanced && (
          <span className="absolute top-2 right-2 font-mono text-[9px] bg-[#4a2a9a] text-[#c0a0f0] px-1.5 py-0.5 rounded">
            ✦ groq
          </span>
        )}

        {/* Editable Strip Labels */}
        <div className="flex gap-2 mb-2">
          <div className="flex flex-col items-start">
            <span className="font-mono text-[10px] text-muted">Strip To:</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={e => update('stripName', e.currentTarget.textContent ?? '')}
              className="font-semibold text-[13px] text-[#e8e020] outline-none focus:bg-[#1a1a00] focus:ring-1 focus:ring-[#e8e020] rounded px-0.5 -mx-0.5 cursor-text"
            >
              {entry.stripName ?? entry.name ?? '(strip to tidak ada)'}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-mono text-[10px] text-muted">Strip From:</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={e => update('stripFrom', e.currentTarget.textContent ?? '')}
              className="font-semibold text-[13px] text-[#a0e8e0] outline-none focus:bg-[#1a1a1a] focus:ring-1 focus:ring-[#4a2a9a] rounded px-0.5 -mx-0.5 cursor-text"
            >
              {entry.stripFrom ?? entry.from ?? '(strip from tidak ada)'}
            </span>
          </div>
        </div>

        {/* Address Card Name/From (for address card, not strip) */}
        <div className="flex gap-2 mb-2">
          <div className="flex flex-col items-start">
            <span className="font-mono text-[10px] text-muted">To:</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={e => update('name', e.currentTarget.textContent ?? '')}
              className="font-semibold text-[13px] text-[#e8e020] outline-none focus:bg-[#1a1a00] focus:ring-1 focus:ring-[#e8e020] rounded px-0.5 -mx-0.5 cursor-text"
            >
              {entry.name || '(nama tidak ada)'}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-mono text-[10px] text-muted">From:</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={e => update('from', e.currentTarget.textContent ?? '')}
              className="font-semibold text-[13px] text-[#a0e8e0] outline-none focus:bg-[#1a1a1a] focus:ring-1 focus:ring-[#4a2a9a] rounded px-0.5 -mx-0.5 cursor-text"
            >
              {entry.from || '(from tidak ada)'}
            </span>
          </div>
        </div>

        {/* Address lines */}
        {entry.address.length > 0 ? (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => update('address', (e.currentTarget.textContent ?? '').split('\n').filter(Boolean))}
            className="font-mono text-[11px] text-muted outline-none focus:bg-[#1a1a1a] focus:ring-1 focus:ring-[#666] rounded px-0.5 -mx-0.5 cursor-text whitespace-pre-wrap"
          >
            {entry.address.join('\n')}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#e04040] mt-0.5">
            <TriangleAlert size={10} />
            tidak ada alamat — address card tidak dicetak
          </div>
        )}

        {/* Phone */}
        {entry.phone && (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => update('phone', e.currentTarget.textContent ?? '')}
            className="font-mono text-[11px] text-muted mt-0.5 outline-none focus:bg-[#1a1a1a] focus:ring-1 focus:ring-[#666] rounded px-0.5 -mx-0.5 cursor-text"
          >
            {entry.phone}
          </div>
        )}
      </div>
    )
}

function GroqProgress({ current, total, name, done }: {
  current: number; total: number; name: string; done: boolean
}) {
  const pct = done ? 100 : Math.round(((current - 1) / total) * 100)
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 bg-[#1a1230] border border-[#4a2a9a] rounded font-mono text-[11px] text-[#a080e0]">
      <div>
        {done
          ? `✓ Selesai — ${total} alamat diproses`
          : `Groq: ${current}/${total} — ${name}...`}
      </div>
      <div className="h-[3px] bg-[#2a1a50] rounded overflow-hidden">
        <div
          className="h-full bg-[#8a54dc] rounded transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SizeInput({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || value)}
      />
    </Field>
  )
}


export default function App() {
  const [rawInput, setRawInput]   = useState('')
  const [entries, setEntries]     = useState<AddressEntry[]>([])
  const [progress, setProgress]   = useState<{
    current: number; total: number; name: string; done: boolean
  } | null>(null)
  const [sizes, setSizes] = useState<PrintSizes>({
    addr: 20,
    stripLabel: 3.5,
    stripName: 5,
    stripWidthCm: 5,
    stripHeightCm: 1
  })
  const [fonts, setFonts] = useState({
    addr: 'IBM Plex Sans',
    strip: 'IBM Plex Mono'
  })

  const printableRef = useRef<HTMLDivElement>(null)
  const previewRef   = useRef<HTMLDivElement>(null)
  const [previewHTML, setPreviewHTML] = useState('')

  // Load Groq API key from .env
  const groqKey = import.meta.env.VITE_GROQ_API_KEY as string

  const updatePreview = useCallback((ents: AddressEntry[], s: PrintSizes, f: { addr: string; strip: string }) => {
    const html = buildPrintHTML(ents, s, f)
    setPreviewHTML(html)
    if (printableRef.current)
      printableRef.current.innerHTML = html
  }, [])

  // Update preview HTML when parsed data changes
  useEffect(() => {
    if (entries.length > 0) {
      // Avoid setState in effect by batching updatePreview logic
      setTimeout(() => updatePreview(entries, sizes, fonts), 0)
    }
  }, [entries, sizes, fonts, updatePreview])

  // Settings persistence
  useEffect(() => {
    const saved = localStorage.getItem('addressPrinterSettings')
    if (saved) {
      let parsed
      try {
        parsed = JSON.parse(saved)
      } catch (err) {
        console.error('Error parsing saved settings:', err)
        // Optionally log or ignore
        parsed = null
      }
      if (parsed) {
        if (parsed.sizes) setTimeout(() => setSizes(parsed.sizes), 0)
        if (parsed.fonts) setTimeout(() => setFonts(parsed.fonts), 0)
      }
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('addressPrinterSettings', JSON.stringify({ sizes, fonts }))
  }, [sizes, fonts])

  const handleUpdate = (index: number, updated: AddressEntry) => {
    setEntries(prev => prev.map((e, i) => i === index ? updated : e))
  }

  const doParseOnly = () => {
    if (!rawInput.trim()) return
    setEntries(parseAddresses(rawInput))
  }

  const doParseAndGroq = async () => {
    if (!rawInput.trim()) return
    const apiKey = groqKey
    if (!apiKey) { alert('Groq API key not set.'); return }

    const parsed = parseAddresses(rawInput)
    setEntries(parsed)

    const total = parsed.length
    const enhanced: AddressEntry[] = []
    for (let i = 0; i < total; i++) {
      setProgress({ current: i + 1, total, name: parsed[i].name || `entry ${i + 1}`, done: false })
      try { enhanced.push(await groqNormalizeOne(parsed[i], apiKey)) }
      catch (err) { console.error(err); enhanced.push({ ...parsed[i], groqEnhanced: false }) }
    }
    setProgress({ current: total, total, name: '', done: true })
    setTimeout(() => setProgress(null), 1500)
    setEntries(enhanced)
  }

  const clearAll = () => {
    setRawInput('')
    setEntries([])
    if (previewRef.current)   previewRef.current.innerHTML = ''
    if (printableRef.current) printableRef.current.innerHTML = ''
  }

  const doPrint = () => {
    if (!entries.length) { alert('Parse dulu sebelum print.'); return }
    if (printableRef.current) {
      printableRef.current.style.display = 'block'
      window.print()
      setTimeout(() => {
        if (printableRef.current) printableRef.current.style.display = 'none'
      }, 800)
    }
  }
  return (
    <>
      <div className="app-grid min-h-screen">

        {/* Topbar */}
        <div className="app-topbar border-b border-[#2a2a2a] px-6 py-3.5 flex items-center">
          <div>
            <div className="font-mono text-[13px] font-semibold tracking-widest uppercase text-[#e8e020]">
              Label Generator
            </div>
            <div className="font-mono text-[11px] text-[#666]">
              Gosyen Solusindo Cemerlang — paste → parse → print
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="app-sidebar border-r border-[#2a2a2a] bg-[#1a1a1a] flex flex-col gap-3.5 p-5 overflow-y-auto">



          <SectionLabel>Input</SectionLabel>
          <Field label="Paste alamat WhatsApp (pisah baris kosong)">
            <Textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={`Mr. Krisna\nJl Swasembada Timur XVI/101A\nRt 008 rw 05\nkebon bawang, tanjung priok\n0899-9026-772\nFrom: Gosyen Solusindo Cemerlang\n\nLutfi 087763527334\nJl. Sunan Kalijaga V, RT.004/RW.011, No.75\nKota Tangerang, 15154\nFrom: Gosyen Solusindo Cemerlang`}
            />
          </Field>

          <Button variant="default" onClick={doParseOnly}>
            <ChevronRight size={13} className="mr-1" /> 1. Parse saja
          </Button>
          <Button variant="secondary" onClick={doParseAndGroq} disabled={!!progress}>
            <Sparkles size={13} className="mr-1" /> 2. Parse + Groq
          </Button>
          <Button variant="ghost" onClick={clearAll}>
            <Trash2 size={13} className="mr-1" /> Clear
          </Button>

          {progress && <GroqProgress {...progress} />}

          <SectionLabel>Ukuran Font — Address Card</SectionLabel>
          <SizeInput label="Semua teks (pt)" value={sizes.addr} min={6} max={24} step={0.5}
            onChange={v => setSizes(s => ({ ...s, addr: v }))} />
          <Field label="Font Address Card">
            <select
              className="font-mono text-xs bg-[#222] border rounded px-2 py-1 mt-1"
              value={fonts.addr}
              onChange={e => setFonts(f => ({ ...f, addr: e.target.value }))}
            >
              <option value="IBM Plex Sans">IBM Plex Sans</option>
              <option value="Arial">Arial</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="serif">Serif</option>
            </select>
          </Field>

          <SectionLabel>Ukuran Font — Sticker Strip</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <SizeInput label="Label kecil (pt)" value={sizes.stripLabel} min={2} max={6} step={0.5}
              onChange={v => setSizes(s => ({ ...s, stripLabel: v }))} />
            <SizeInput label="Nama (pt)" value={sizes.stripName} min={3} max={8} step={0.5}
              onChange={v => setSizes(s => ({ ...s, stripName: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <SizeInput label="Strip Width (cm)" value={sizes.stripWidthCm} min={2} max={20} step={0.1}
              onChange={v => setSizes(s => ({ ...s, stripWidthCm: v }))} />
            <SizeInput label="Strip Height (cm)" value={sizes.stripHeightCm} min={0.5} max={5} step={0.1}
              onChange={v => setSizes(s => ({ ...s, stripHeightCm: v }))} />
          </div>
          <Field label="Font Strip Label">
            <select
              className="font-mono text-xs bg-[#222] border rounded px-2 py-1 mt-1"
              value={fonts.strip}
              onChange={e => setFonts(f => ({ ...f, strip: e.target.value }))}
            >
              <option value="IBM Plex Mono">IBM Plex Mono</option>
              <option value="Arial">Arial</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="monospace">Monospace</option>
            </select>
          </Field>

          <SectionLabel>Parsed</SectionLabel>
          <div className="flex flex-col gap-2 pb-4">
            {entries.length === 0 ? (
              <div className="font-mono text-[11px] text-center text-[#666] py-10 px-5 border border-dashed border-[#2a2a2a] rounded-md leading-loose">
                Belum ada data.<br />Paste alamat lalu klik Parse.
              </div>
            ) : (
              entries.map((e, i) => <ParsedCard key={i} entry={e} index={i} onUpdate={handleUpdate} />)
            )}
          </div>

        </div>

        {/* Main */}
        <div className="app-main p-5 overflow-y-auto bg-[#0f0f0f]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#666]">
              Print Preview (A4)
            </span>
            <Button variant="outline" onClick={doPrint}>
              <Printer size={13} className="mr-1.5" /> Print / Save PDF
            </Button>
          </div>
          <div className="bg-[#2a2a2a] p-5 rounded-md overflow-x-auto">
            {entries.length === 0 ? (
              <div className="font-mono text-[11px] text-center text-[#666] py-10 px-5 border border-dashed border-[#444] rounded-md bg-[#222] leading-loose">
                Preview akan muncul di sini setelah parse.
              </div>
            ) : (
              <div
                ref={previewRef}
                contentEditable
                suppressContentEditableWarning
                className="print-preview-editable"
                style={{ minHeight: '300px', outline: 'none', background: 'transparent' }}
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                onBlur={e => {
                  const html = e.currentTarget.innerHTML
                  setPreviewHTML(html)
                  // Sync preview edits to parsed data
                  try {
                    const temp = document.createElement('div')
                    temp.innerHTML = html
                    // Parse strips
                    const stripPairs = temp.querySelectorAll('.strip-pair')
                    const newEntries = [...entries]
                    stripPairs.forEach((pair, i) => {
                      const to = pair.querySelector('.strip-name:nth-child(2)')?.textContent || ''
                      const from = pair.querySelector('.strip-name:nth-child(4)')?.textContent || ''
                      if (newEntries[i]) {
                        newEntries[i].stripName = to
                        newEntries[i].stripFrom = from
                      }
                    })
                    // Parse address cards
                    const addrCards = temp.querySelectorAll('.addr-card')
                    addrCards.forEach((card, i) => {
                      const name = card.querySelector('.addr-recipient-name')?.textContent || ''
                      const from = card.querySelector('.addr-sender-name')?.textContent || ''
                      if (newEntries[i]) {
                        newEntries[i].name = name
                        newEntries[i].from = from
                      }
                    })
                    setEntries(newEntries)
                  } catch (error) {
                    console.error('Error occurred while syncing preview edits:', error)
                  }
                }}
              />
            )}
          </div>
        </div>

      </div>

      <div id="printable" ref={printableRef} style={{ display: 'none' }} />
    </>
  )
}

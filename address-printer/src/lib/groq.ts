import type { AddressEntry } from '@/types'

const SYSTEM = `You are an Indonesian address normalizer. Return ONLY a raw JSON object, no markdown, no explanation:
{"name":"recipient proper case","phone":"number or empty","address":["clean","address","lines"],"from":"sender or empty"}

Rules:
- Proper case names and streets (fix ALL CAPS and all lowercase)
- Expand: "Jl" -> "Jl.", "Kel" -> "Kel.", "Kec" -> "Kec."
- Normalize RT/RW: "rt004 rw06" -> "RT 004/RW 06"
- Split into logical lines: street | Kel/Kec | kota + kodepos
- Infer kota/provinsi if confident from context
- If no address, return "address":[]`

interface GroqResult {
  name?: string
  phone?: string
  address?: string[]
  from?: string
}

export async function groqNormalizeOne(entry: AddressEntry, apiKey: string): Promise<AddressEntry> {
  const raw = [
    entry.name,
    ...entry.address,
    entry.phone,
    entry.from ? 'From: ' + entry.from : '',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: raw },
      ],
    }),
  })

  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(e?.error?.message ?? 'Groq error ' + res.status)
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = (data.choices?.[0]?.message?.content ?? '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  const p = JSON.parse(text) as GroqResult
  return {
    name:    p.name    ?? entry.name,
    phone:   p.phone   ?? entry.phone,
    address: Array.isArray(p.address) ? p.address : entry.address,
    from:    p.from    ?? entry.from,
    groqEnhanced: true,
  }
}

import type { AddressEntry, PrintSizes } from '@/types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPrintHTML(
  entries: AddressEntry[],
  sizes: PrintSizes,
  fonts?: { addr: string; strip: string }
): string {
  const { addr, stripLabel, stripName, stripWidthCm, stripHeightCm } = sizes
  const addrFont = fonts?.addr || 'IBM Plex Sans';
  const stripFont = fonts?.strip || 'IBM Plex Mono';

  const stripsInner = entries.map((e, i) => {
    const sep = i > 0 ? `<div class="strip-group-sep"></div>` : ''
    const stripStyle = `width:${stripWidthCm}cm;height:${stripHeightCm}cm;font-family:${stripFont},monospace;`;
    return `${sep}
      <div class="strip-pair">
        <div class="strip" style="${stripStyle}">
          <span class="strip-role" style="font-size:${stripLabel}pt;font-family:${stripFont},monospace;">To:</span>
          <span class="strip-name" style="font-size:${stripName}pt;font-family:${stripFont},monospace;">${esc(e.stripName ?? e.name ?? '-')}</span>
        </div>
        <div class="strip" style="${stripStyle}">
          <span class="strip-role" style="font-size:${stripLabel}pt;font-family:${stripFont},monospace;">From:</span>
          <span class="strip-name" style="font-size:${stripName}pt;font-family:${stripFont},monospace;">${esc(e.stripFrom ?? e.from ?? '-')}</span>
        </div>
      </div>`
  }).join('')

  const withAddr = entries.filter(e => e.address.length > 0)
  const addrCards = withAddr.map(e => `
    <div class="addr-card" style="font-family:${addrFont},sans-serif;">
      <div class="addr-half">
        <div class="addr-role-label">Kepada / To</div>
        <div class="addr-recipient-name" style="font-size:${addr}pt;font-family:${addrFont},sans-serif;">${esc(e.name || '-')}</div>
        <div class="addr-lines" style="font-size:${addr}pt;font-family:${addrFont},sans-serif;">${e.address.map(esc).join('<br>')}</div>
        ${e.phone ? `<div class="addr-phone" style="font-size:${addr}pt;font-family:${addrFont},sans-serif;">✆ ${esc(e.phone)}</div>` : ''}
      </div>
      <div class="addr-half">
        <div class="addr-role-label">Dari / From</div>
        <div class="addr-sender-name" style="font-size:${addr}pt;font-family:${addrFont},sans-serif;">${esc(e.from || '-')}</div>
      </div>
    </div>`).join('')

  return `
    <div class="print-page">
      <div class="strips-section">${stripsInner}</div>
      ${addrCards ? `<div class="addr-section">${addrCards}</div>` : ''}
    </div>`
}

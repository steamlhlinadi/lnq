// npm install escpos@3.0.0-alpha.6 escpos-network@3.0.0-alpha.5
import escpos from 'escpos';
import Network from 'escpos-network';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface PrinterConfig {
  host: string;   // e.g. "192.168.0.128"
  port?: number;  // default 9100
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotaItem = {
  code: string;        // e.g. "H.301"
  description: string; // e.g. "2NS400"
  quantity: number;
  price: number;       // integer (IDR), required
  notes?: string[];
};

export type NotaOrder = {
  customer: string;  // e.g. "Gosyen Solusindo Cemerlang" — printed as title
  date: Date | string;
  items: NotaItem[];
  notes?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WIDTH = 30;

function formatPrice(price: number): string {
  return `Rp${price.toLocaleString('id-ID')}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function rightAlign(left: string, right: string, width = WIDTH): string {
  const gap = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, gap)) + right;
}

// ─── Print ────────────────────────────────────────────────────────────────────

export function printNota(order: NotaOrder, config: PrinterConfig): Promise<void> {
  const device = new Network(config.host, config.port ?? 9100);

  return new Promise((resolve, reject) => {
    device.open(async (err: Error | null) => {
      if (err) return reject(err);

      try {
        const printer = new escpos.Printer(device, { encoding: 'UTF-8', width: WIDTH });

        // ── HEADER (centered) ──
        printer
          .align('ct')
          .style('b').text('LnQ Cake & Cookies').style('normal')
          .text(order.customer)
          .text(formatDate(order.date))
          .drawLine();

        // ── ITEMS (left) ──
        printer.align('lt');

        let total = 0;

        for (const item of order.items) {
          const lineTotal = item.quantity * item.price;
          total += lineTotal;

          // Item code: bold only, normal size
          printer.style('b').text(`${item.quantity}x ${item.code}`).style('normal');

          // Description
          if (item.description) printer.text(`   ${item.description}`);

          // Price row: right-aligned at normal width
          const priceLeft = `   ${item.quantity} x ${formatPrice(item.price)}`;
          printer.text(rightAlign(priceLeft, formatPrice(lineTotal)));

          // Per-item notes
          if (item.notes?.length) {
            for (const note of item.notes) {
              printer.text(`   (${note})`);
            }
          }

          printer.feed(1);
        }

        printer.drawLine();

        // ── TOTAL (left label, centered big price) ──
        printer
          .align('lt').style('b').text('Total').style('normal')
          .align('ct').size(1, 1).style('b').text(formatPrice(total)).style('normal').size(0, 0)
          .feed(1);

        // ── NOTES (left) ──
        if (order.notes) {
          printer.align('lt').text('Catatan:');
          for (const line of order.notes.split('\n')) {
            printer.text(`  ${line.trim()}`);
          }
          printer.feed(1);
        }

        // ── FOOTER (centered) ──
        printer.align('ct').text('Terima kasih!').feed(1);

        // ── FLUSH + CUT + CLOSE ──
        printer.cut();
        printer.close(() => resolve());

      } catch (e) {
        device.close(() => reject(e));
      }
    });
  });
}

// ─── Usage example ────────────────────────────────────────────────────────────
//
 printNota(
  {
    customer: 'Gosyen Solusindo Cemerlang',
    date: new Date('2025-03-15'),
    items: [
      { code: 'H.315', description: '',   quantity: 1, price: 50_000 },
      { code: 'Nastar 400ml', description: '', quantity: 1, price: 55_000 },
      { code: 'Semprit 400ml', description: '',    quantity: 1, price: 35_000},
      { code: 'Lapis 1/2', description: '',    quantity: 1, price: 240_000},
      { code: 'Ongkos Kirim', description: '',    quantity: 1, price: 35_000},
    ],
    notes: 'From: Gosyen Solusindo Cemerlang',
  },
  { host: '192.168.0.128' },
);
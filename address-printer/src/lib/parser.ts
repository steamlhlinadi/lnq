import type { AddressEntry } from "@/types";

export function parseAddresses(raw: string): AddressEntry[] {
  return raw
    .trim()
    .split(/\n\s*\n+/)
    .map((b) => parseOne(b.trim()))
    .filter((x) => x.name || x.address.length > 0);
}

function parseOne(block: string): AddressEntry {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let name = "",
    phone = "",
    from = "";
  const addrLines: string[] = [];
  const rePhone = /(\+?62|0)[0-9][\d\s.-]{6,14}/;
  const reFrom = /^from\s*[:]\s*/i;
  const reTo = /^(to|attn|kepada)\s*[:]\s*/i;
  const rePos = /^pos\s*[:]\s*/i;
  const reKel = /^kel\.?\s+/i;
  const reKec = /^kec\.?\s+/i;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (reFrom.test(l)) {
      from = l.replace(reFrom, "").trim();
      continue;
    }
    if (reTo.test(l)) {
      const c = l.replace(reTo, "").trim();
      if (!name) name = c;
      else addrLines.push(c);
      continue;
    }
    if (rePos.test(l)) {
      addrLines.push("Pos: " + l.replace(rePos, "").trim());
      continue;
    }
    const pm = l.match(rePhone);
    if (pm) {
      phone = pm[0].replace(/\s/g, "");
      const rest = l
        .replace(rePhone, "")
        .trim()
        .replace(/[,\s]+$/, "")
        .trim();
      if (rest && !name) name = rest;
      else if (rest && rest.length > 3) addrLines.push(rest);
      continue;
    }
    if (!name && i === 0) {
      name = l;
      continue;
    }
    addrLines.push(l);
  }

  return {
    name,
    phone,
    from,
    groqEnhanced: false,
    address: addrLines
      .map((l) => l.replace(reKel, "Kel. ").replace(reKec, "Kec. "))
      .filter((l) => l.length > 1),
  };
}

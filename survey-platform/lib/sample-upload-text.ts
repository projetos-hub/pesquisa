const WINDOWS_1252_BYTES: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
}

const MOJIBAKE_MARKERS = /(?:\u00c3|\u00c2|\u00e2[\u0080-\u009f\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]|\ufffd)/

function windows1252BytesFromString(value: string): Uint8Array | null {
  const bytes: number[] = []

  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) return null

    if (codePoint <= 0xff) {
      bytes.push(codePoint)
      continue
    }

    const mappedByte = WINDOWS_1252_BYTES[codePoint]
    if (mappedByte === undefined) return null
    bytes.push(mappedByte)
  }

  return Uint8Array.from(bytes)
}

function decodeAsUtf8FromWindows1252(value: string): string | null {
  const bytes = windows1252BytesFromString(value)
  if (!bytes) return null

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

export function repairMojibake(value: string): string {
  let current = value

  for (let i = 0; i < 3 && MOJIBAKE_MARKERS.test(current); i++) {
    const decoded = decodeAsUtf8FromWindows1252(current)
    if (!decoded || decoded === current) break
    current = decoded
  }

  return current
}

export function excelText(value: unknown): string {
  return repairMojibake(String(value ?? ''))
}
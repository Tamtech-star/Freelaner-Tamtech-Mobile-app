// Pure helpers for the freelancer payment-receipt (PDF) download.
// Deliberately free of react-native / expo imports so node --test can exercise them.

export const RECEIPT_MIME_TYPE = "application/pdf"
export const RECEIPT_UTI = "com.adobe.pdf"

export function normalizeReceiptPaymentCode(paymentCode: string): string {
  return (paymentCode || "").trim().toUpperCase()
}

// Mirrors the server's Content-Disposition filename (payment-receipt-<CODE>.pdf).
// Payment codes are only [A-Z0-9-], so anything else (slashes, dots, spaces) collapses
// to a single dash — that keeps "..", "/" and path separators out of the cache path.
export function buildReceiptFileName(paymentCode: string): string {
  const safeCode =
    normalizeReceiptPaymentCode(paymentCode)
      .replace(/[^A-Z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "") || "payment"
  return `payment-receipt-${safeCode}.pdf`
}

export function utf8Encode(value: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    let codePoint = value.charCodeAt(i)
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00)
        i += 1
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
    } else if (codePoint < 0x10000) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f))
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      )
    }
  }
  return Uint8Array.from(bytes)
}

// Hermes has no guaranteed TextDecoder, so decode manually.
export function utf8Decode(bytes: Uint8Array): string {
  let result = ""
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
      continue
    }
    let size = 0
    let codePoint = 0
    if ((byte & 0xe0) === 0xc0) {
      size = 1
      codePoint = byte & 0x1f
    } else if ((byte & 0xf0) === 0xe0) {
      size = 2
      codePoint = byte & 0x0f
    } else if ((byte & 0xf8) === 0xf0) {
      size = 3
      codePoint = byte & 0x07
    } else {
      result += "\uFFFD"
      continue
    }
    if (i + size >= bytes.length) {
      result += "\uFFFD"
      continue
    }
    let complete = true
    for (let offset = 1; offset <= size; offset += 1) {
      const continuation = bytes[i + offset]
      if (continuation === undefined || (continuation & 0xc0) !== 0x80) {
        complete = false
        break
      }
      codePoint = (codePoint << 6) | (continuation & 0x3f)
    }
    if (!complete) {
      result += "\uFFFD"
      continue
    }
    i += size
    if (codePoint > 0xffff) {
      const adjusted = codePoint - 0x10000
      result += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff))
    } else {
      result += String.fromCharCode(codePoint)
    }
  }
  return result
}

// axios is configured with responseType "arraybuffer"; React Native may also hand
// back a Uint8Array, a typed-array view or (rarely) a raw byte/character array.
export function toReceiptBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (typeof data === "string") return utf8Encode(data)
  if (Array.isArray(data)) {
    if (data.length === 0) return new Uint8Array(0)
    return Uint8Array.from(data as number[])
  }
  throw new Error("Unexpected payment receipt payload.")
}

// Error bodies arrive as bytes too, so pull the JSON message out by hand.
export function decodeReceiptErrorMessage(data: unknown): string | null {
  if (data === null || data === undefined) return null

  let text: string
  if (typeof data === "string") {
    text = data
  } else {
    try {
      text = utf8Decode(toReceiptBytes(data))
    } catch {
      return null
    }
  }

  const trimmed = text.trim()
  if (!trimmed.startsWith("{")) return null

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown }
    const candidate =
      typeof parsed.error === "string" ? parsed.error : typeof parsed.message === "string" ? parsed.message : null
    const message = candidate?.trim()
    return message ? message : null
  } catch {
    return null
  }
}

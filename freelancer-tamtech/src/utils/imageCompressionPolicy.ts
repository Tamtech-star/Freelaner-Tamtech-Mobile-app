export const MAX_UPLOAD_IMAGE_BYTES = 650 * 1024
export const MAX_UPLOAD_IMAGE_DIMENSION = 1600

const COMPRESSION_QUALITIES = [0.72, 0.58, 0.44, 0.32] as const

export function shouldCompressImage(mimeType: string | null | undefined): boolean {
  return typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/")
}

export function getCompressionQualities(): number[] {
  return [...COMPRESSION_QUALITIES]
}

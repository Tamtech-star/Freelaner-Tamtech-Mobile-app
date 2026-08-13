import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { File } from "expo-file-system"
import {
  getCompressionQualities,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_DIMENSION,
  shouldCompressImage,
} from "./imageCompressionPolicy"

export type CompressedImage = {
  uri: string
  name: string
  type: "image/jpeg"
}

function jpegName(name: string): string {
  const stem = name.replace(/\.[^/.]+$/, "") || "document"
  return `${stem}.jpg`
}

export async function compressImageForUpload(
  uri: string,
  name: string,
  mimeType: string,
  sourceWidth?: number,
): Promise<CompressedImage> {
  if (!shouldCompressImage(mimeType)) {
    throw new Error(`Unsupported upload type for image compression: ${mimeType}`)
  }

  const source = new File(uri)
  const sourceInfo = source.info()
  const sourceSize = sourceInfo.size ?? 0
  if (sourceSize > 0 && sourceSize <= MAX_UPLOAD_IMAGE_BYTES && mimeType === "image/jpeg") {
    return { uri, name: jpegName(name), type: "image/jpeg" }
  }

  let lastResult: CompressedImage | null = null
  const actions = sourceWidth && sourceWidth > MAX_UPLOAD_IMAGE_DIMENSION
    ? [{ resize: { width: MAX_UPLOAD_IMAGE_DIMENSION } }]
    : []
  for (const quality of getCompressionQualities()) {
    const result = await manipulateAsync(
      uri,
      actions,
      { compress: quality, format: SaveFormat.JPEG },
    )
    const resultInfo = new File(result.uri).info()
    const resultSize = resultInfo.size ?? 0
    lastResult = { uri: result.uri, name: jpegName(name), type: "image/jpeg" }
    if (resultSize > 0 && resultSize <= MAX_UPLOAD_IMAGE_BYTES) return lastResult
  }

  if (!lastResult) throw new Error("Could not compress image for upload.")
  throw new Error("This image is still too large after compression. Please retake it closer to the document.")
}

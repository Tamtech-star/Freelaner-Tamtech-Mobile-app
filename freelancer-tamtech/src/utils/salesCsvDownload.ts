import { Platform } from "react-native"
import { File, Paths } from "expo-file-system"
import * as LegacyFileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import type { SalesCsvRow } from "./salesCsv"
import { createSalesCsv, sanitizeCsvFileName } from "./salesCsv"

function assertRows(rows: SalesCsvRow[]): void {
  if (rows.length === 0) throw new Error("There are no sales records to export.")
}

function createCachedCsv(rows: SalesCsvRow[], title: string): File {
  const file = new File(Paths.cache, sanitizeCsvFileName(title))
  file.write(createSalesCsv(rows), { encoding: "utf8" })
  return file
}

export async function downloadSalesCsv(rows: SalesCsvRow[], title: string): Promise<string> {
  assertRows(rows)
  const fileName = sanitizeCsvFileName(title)
  const csv = createSalesCsv(rows)

  if (Platform.OS !== "android") {
    const file = new File(Paths.document, fileName)
    file.write(csv, { encoding: "utf8" })
    return file.uri
  }

  const permission = await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
  if (!permission.granted) throw new Error("Choose a folder to save the CSV file.")

  const baseName = fileName.replace(/\.csv$/i, "")
  const destination = await LegacyFileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    baseName,
    "text/csv",
  )
  await LegacyFileSystem.StorageAccessFramework.writeAsStringAsync(destination, csv, {
    encoding: LegacyFileSystem.EncodingType.UTF8,
  })
  return destination
}

export async function shareSalesCsv(rows: SalesCsvRow[], title: string): Promise<void> {
  assertRows(rows)
  const file = createCachedCsv(rows, title)

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.")
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: `Share ${title} CSV`,
  })
}

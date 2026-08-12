import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import type { SalesCsvRow } from "../utils/salesCsv"
import { createSalesCsv, sanitizeCsvFileName } from "../utils/salesCsv"

export async function downloadSalesCsv(rows: SalesCsvRow[], title: string): Promise<void> {
  if (rows.length === 0) throw new Error("There are no sales records to download.")

  const file = new File(Paths.cache, sanitizeCsvFileName(title))
  file.write(createSalesCsv(rows), { encoding: "utf8" })

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.")
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: `Download ${title} CSV`,
  })
}

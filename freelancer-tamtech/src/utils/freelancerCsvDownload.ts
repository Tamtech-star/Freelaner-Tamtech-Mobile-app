import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import type { FreelancerRow } from "../api/admin"
import { createFreelancersCsv } from "./freelancerCsv"
import { sanitizeCsvFileName } from "./salesCsv"

export async function downloadFreelancersCsv(rows: FreelancerRow[]): Promise<void> {
  if (rows.length === 0) throw new Error("There are no freelancer records to download.")

  const file = new File(Paths.cache, sanitizeCsvFileName("Freelancers"))
  file.write(createFreelancersCsv(rows), { encoding: "utf8" })

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.")
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Download Freelancers CSV",
  })
}

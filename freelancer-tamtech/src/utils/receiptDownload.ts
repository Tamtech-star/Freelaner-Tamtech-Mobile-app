import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { downloadReceipt } from "../api/portal"
import {
  buildReceiptFileName,
  normalizeReceiptPaymentCode,
  RECEIPT_MIME_TYPE,
  RECEIPT_UTI,
} from "./receiptPdf"

// Fetches the server-generated commission receipt PDF, writes it to the app cache
// and opens the OS share sheet so it can be saved or viewed.
// Mirrors downloadFreelancersCsv in freelancerCsvDownload.ts.
export async function downloadPaymentReceipt(paymentCode: string): Promise<string> {
  const code = normalizeReceiptPaymentCode(paymentCode)
  if (!code) throw new Error("A payment code is required to download a receipt.")

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.")
  }

  const bytes = await downloadReceipt(code)
  if (bytes.length === 0) throw new Error("The receipt file came back empty.")

  const file = new File(Paths.cache, buildReceiptFileName(code))
  if (file.exists) file.delete()
  file.write(bytes)

  await Sharing.shareAsync(file.uri, {
    mimeType: RECEIPT_MIME_TYPE,
    UTI: RECEIPT_UTI,
    dialogTitle: `Payment Receipt ${code}`,
  })

  return file.uri
}

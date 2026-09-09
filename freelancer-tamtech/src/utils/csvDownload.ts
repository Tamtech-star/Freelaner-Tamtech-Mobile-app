import { Platform } from "react-native"
import { File, Paths } from "expo-file-system"
import * as LegacyFileSystem from "expo-file-system/legacy"
import { sanitizeCsvFileName } from "./salesCsv"

// Writes a CSV string to a real file the user can find (Downloads / chosen folder),
// rather than opening the OS share sheet. Mirrors downloadSalesCsv in salesCsvDownload.ts.
export async function downloadCsvFile(csv: string, baseName: string): Promise<string> {
  const fileName = sanitizeCsvFileName(baseName)

  if (Platform.OS !== "android") {
    const file = new File(Paths.document, fileName)
    file.write(csv, { encoding: "utf8" })
    return file.uri
  }

  const permission = await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
  if (!permission.granted) throw new Error("Choose a folder to save the CSV file.")

  const base = fileName.replace(/\.csv$/i, "")
  const destination = await LegacyFileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    base,
    "text/csv",
  )
  await LegacyFileSystem.StorageAccessFramework.writeAsStringAsync(destination, csv, {
    encoding: LegacyFileSystem.EncodingType.UTF8,
  })
  return destination
}

import fs from 'fs'
import path from 'path'
import os from 'os'
import unzipper from 'unzipper'

export async function extractZip(zipPath: string): Promise<string> {
  const extractDir = path.join(os.tmpdir(), 'ssa-names-extracted')
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true })
  }
  fs.mkdirSync(extractDir, { recursive: true })

  console.log(`Extracting ${zipPath}...`)
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractDir }))
    .promise()

  const files = fs.readdirSync(extractDir)
  const yearFiles = files.filter(f => /^yob\d{4}\.txt$/.test(f))
  console.log(`Extracted ${yearFiles.length} year files (${files.length} total files)`)
  return extractDir
}

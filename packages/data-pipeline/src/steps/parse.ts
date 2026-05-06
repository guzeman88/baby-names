import fs from 'fs'
import path from 'path'

export interface RawRecord {
  name: string
  gender: 'M' | 'F'
  births: number
  year: number
}

export function parseYearFile(filePath: string, year: number): RawRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const records: RawRecord[] = []
  const seen = new Set<string>()

  for (const line of content.trim().split('\n')) {
    const parts = line.trim().split(',')
    if (parts.length < 3) continue
    const [rawName, sex, birthsStr] = parts
    const name = rawName?.trim()
    if (!name || !sex || !birthsStr) continue
    if (sex !== 'M' && sex !== 'F') continue
    const births = parseInt(birthsStr.trim(), 10)
    if (isNaN(births) || births < 5) continue

    const key = `${name}:${sex}`
    if (seen.has(key)) continue // skip duplicates
    seen.add(key)

    records.push({ name, gender: sex as 'M' | 'F', births, year })
  }

  return records
}

export function parseAllYearFiles(extractDir: string): RawRecord[] {
  const files = fs.readdirSync(extractDir).filter(f => /^yob\d{4}\.txt$/.test(f))
  files.sort() // chronological order

  const allRecords: RawRecord[] = []
  let fileCount = 0

  for (const file of files) {
    const year = parseInt(file.replace('yob', '').replace('.txt', ''), 10)
    const records = parseYearFile(path.join(extractDir, file), year)
    allRecords.push(...records)
    fileCount++
    if (fileCount % 20 === 0) {
      process.stdout.write(`\r  Parsed ${fileCount}/${files.length} year files...`)
    }
  }
  console.log(`\n  Total raw records: ${allRecords.length.toLocaleString()}`)
  return allRecords
}

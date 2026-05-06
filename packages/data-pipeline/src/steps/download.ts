import fs from 'fs'
import path from 'path'
import os from 'os'
import { pipeline } from 'stream/promises'
import fetch from 'node-fetch'

const SSA_URL = 'https://www.ssa.gov/oact/babynames/names.zip'

export async function downloadSSAData(localZip?: string): Promise<string> {
  if (localZip) {
    console.log(`Using local ZIP: ${localZip}`)
    return localZip
  }

  const dest = path.join(os.tmpdir(), 'ssa-names.zip')
  console.log(`Downloading SSA data from ${SSA_URL}...`)

  let attempt = 0
  while (attempt < 3) {
    try {
      const response = await fetch(SSA_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.ssa.gov/oact/babynames/limits.html',
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('No response body')
      const fileStream = fs.createWriteStream(dest)
      await pipeline(response.body as any, fileStream)
      console.log(`Downloaded to ${dest}`)
      return dest
    } catch (err) {
      attempt++
      if (attempt >= 3) throw err
      console.warn(`Download attempt ${attempt} failed, retrying...`)
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  throw new Error('Download failed after 3 attempts')
}

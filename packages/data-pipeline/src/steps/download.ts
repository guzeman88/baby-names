import fs from 'fs'
import path from 'path'
import os from 'os'
import { pipeline } from 'stream/promises'
import fetch from 'node-fetch'

const SSA_URL = 'https://www.ssa.gov/oact/babynames/names.zip'
const GITHUB_FALLBACK_URL = 'https://github.com/guzeman88/baby-names/releases/download/v1.0-data/ssa-names.zip'

async function tryDownload(url: string, dest: string, headers?: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(url, { headers })
    if (!response.ok || !response.body) return false
    const fileStream = fs.createWriteStream(dest)
    await pipeline(response.body as any, fileStream)
    return true
  } catch {
    return false
  }
}

export async function downloadSSAData(localZip?: string): Promise<string> {
  if (localZip) {
    console.log(`Using local ZIP: ${localZip}`)
    return localZip
  }

  const dest = path.join(os.tmpdir(), 'ssa-names.zip')

  // Try SSA.gov first
  console.log(`Downloading SSA data from ${SSA_URL}...`)
  const ssaSuccess = await tryDownload(SSA_URL, dest, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.ssa.gov/oact/babynames/limits.html',
  })
  if (ssaSuccess) {
    console.log(`Downloaded from SSA.gov to ${dest}`)
    return dest
  }

  // Fallback: GitHub release mirror
  console.warn('SSA.gov download failed, trying GitHub release mirror...')
  const ghSuccess = await tryDownload(GITHUB_FALLBACK_URL, dest)
  if (ghSuccess) {
    console.log(`Downloaded from GitHub mirror to ${dest}`)
    return dest
  }

  throw new Error('Failed to download SSA data from all sources (SSA.gov and GitHub mirror)')
}

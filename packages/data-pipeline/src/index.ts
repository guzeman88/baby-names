#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { downloadSSAData } from './steps/download.js'
import { extractZip } from './steps/extract.js'
import { parseAllYearFiles } from './steps/parse.js'
import { aggregate } from './steps/aggregate.js'
import { computeRanks } from './steps/computeRanks.js'
import { loadToDatabase } from './steps/loadDatabase.js'

const REF_WINDOW_YEARS = 10
const currentYear = new Date().getFullYear()
const REF_START = currentYear - REF_WINDOW_YEARS
const REF_END = currentYear - 1

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const localZip = args.find(a => a.startsWith('--zip='))?.split('=')[1]

  console.log(`\n=== Baby Name Data Pipeline ===`)
  console.log(`Reference window: ${REF_START}–${REF_END}`)
  if (dryRun) console.log('[DRY RUN MODE — no database writes]')
  console.log()

  const prisma = new PrismaClient({
    log: dryRun ? [] : ['warn', 'error'],
  })

  try {
    // Step 1: Download
    console.log('Step 1: Download SSA data')
    const zipPath = await downloadSSAData(localZip)

    // Step 2: Extract
    console.log('Step 2: Extract ZIP')
    const extractDir = await extractZip(zipPath)

    // Step 3: Parse
    console.log('Step 3: Parse year files')
    const rawRecords = parseAllYearFiles(extractDir)

    // Step 4: Aggregate
    console.log('Step 4: Aggregate by name/gender')
    const aggregated = aggregate(rawRecords, REF_START, REF_END)

    // Step 5: Compute ranks and percentiles
    console.log('Step 5: Compute ranks and percentiles')
    const processed = computeRanks(aggregated)

    const maleCount = processed.filter(n => n.gender === 'M').length
    const femaleCount = processed.filter(n => n.gender === 'F').length
    console.log(`  Male names: ${maleCount.toLocaleString()}`)
    console.log(`  Female names: ${femaleCount.toLocaleString()}`)

    // Step 6: Load to database
    console.log('Step 6: Load to database')
    await loadToDatabase(prisma, processed, dryRun)

    console.log('\n=== Pipeline Complete ===')
    console.log(`Processed ${processed.length.toLocaleString()} name/gender combinations`)
  } catch (err) {
    console.error('Pipeline failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

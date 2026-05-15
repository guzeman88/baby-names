/**
 * Runs the SSA data pipeline only if the names table is empty.
 * Called once at startup before the API server starts.
 */
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pipelineDir = path.resolve(__dirname, '../../../packages/data-pipeline')

const prisma = new PrismaClient()

try {
  const count = await prisma.name.count()
  console.log(`Names in database: ${count}`)

  if (count < 1000) {
    console.log('Database has fewer than 1000 names — running SSA data pipeline...')
    execSync('npx tsx src/index.ts', { stdio: 'inherit', cwd: pipelineDir })
    console.log('Pipeline complete!')
  } else {
    console.log(`Skipping pipeline — ${count.toLocaleString()} names already loaded`)
  }
} finally {
  await prisma.$disconnect()
}

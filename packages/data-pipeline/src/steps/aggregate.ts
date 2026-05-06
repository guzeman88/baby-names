import type { RawRecord } from './parse.js'

export interface NameKey {
  name: string
  gender: 'M' | 'F'
}

export interface AggregatedName extends NameKey {
  totalBirths: number
  recentBirths: number
  peakBirths: number
  peakYear: number
  firstYear: number
  lastYear: number
  yearlyStats: Array<{ year: number; births: number }>
}

export function aggregate(records: RawRecord[], refWindowStartYear: number, refWindowEndYear: number): AggregatedName[] {
  // Group by name+gender
  const map = new Map<string, AggregatedName>()

  for (const record of records) {
    const key = `${record.name}:${record.gender}`
    let entry = map.get(key)
    if (!entry) {
      entry = {
        name: record.name,
        gender: record.gender,
        totalBirths: 0,
        recentBirths: 0,
        peakBirths: 0,
        peakYear: record.year,
        firstYear: record.year,
        lastYear: record.year,
        yearlyStats: [],
      }
      map.set(key, entry)
    }

    entry.totalBirths += record.births
    entry.yearlyStats.push({ year: record.year, births: record.births })

    if (record.year >= refWindowStartYear && record.year <= refWindowEndYear) {
      entry.recentBirths += record.births
    }
    if (record.births > entry.peakBirths) {
      entry.peakBirths = record.births
      entry.peakYear = record.year
    }
    if (record.year < entry.firstYear) entry.firstYear = record.year
    if (record.year > entry.lastYear) entry.lastYear = record.year
  }

  // Sort yearly stats
  for (const entry of map.values()) {
    entry.yearlyStats.sort((a, b) => a.year - b.year)
  }

  console.log(`  Unique name/gender combinations: ${map.size.toLocaleString()}`)
  return Array.from(map.values())
}

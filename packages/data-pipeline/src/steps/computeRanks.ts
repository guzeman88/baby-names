import type { AggregatedName } from './aggregate.js'

export interface ProcessedName extends AggregatedName {
  popularityRank: number
  popularityPercentile: number
  peakRank: number
}

export function computeRanks(names: AggregatedName[]): ProcessedName[] {
  const result: ProcessedName[] = []

  for (const gender of ['M', 'F'] as const) {
    const genderNames = names
      .filter(n => n.gender === gender)
      .sort((a, b) => b.recentBirths - a.recentBirths || b.totalBirths - a.totalBirths)

    const total = genderNames.length

    genderNames.forEach((n, index) => {
      const popularityRank = index + 1
      const popularityPercentile = Math.round(((total - popularityRank) / total) * 10000) / 100

      result.push({
        ...n,
        popularityRank,
        popularityPercentile,
        peakRank: popularityRank, // Will compute properly below
      })
    })
  }

  // Compute peak rank by finding each name's best year-rank
  // We'll compute year-specific ranks now
  return computePeakRanks(result)
}

function computePeakRanks(names: ProcessedName[]): ProcessedName[] {
  // Group yearly births by gender and year to compute per-year ranks
  const yearGenderMap = new Map<string, Array<{ name: string; births: number }>>()

  for (const n of names) {
    for (const stat of n.yearlyStats) {
      const key = `${n.gender}:${stat.year}`
      if (!yearGenderMap.has(key)) yearGenderMap.set(key, [])
      yearGenderMap.get(key)!.push({ name: n.name, births: stat.births })
    }
  }

  // Sort each year-gender group and create rank map
  const rankMap = new Map<string, number>() // key: "name:gender:year" -> rank

  for (const [key, entries] of yearGenderMap) {
    const [gender, yearStr] = key.split(':')
    entries.sort((a, b) => b.births - a.births)
    entries.forEach((e, i) => {
      rankMap.set(`${e.name}:${gender}:${yearStr}`, i + 1)
    })
  }

  // Add rankThatYear to yearlyStats and compute peakRank
  return names.map(n => {
    let peakRank = Infinity
    const yearlyStatsWithRank = n.yearlyStats.map(stat => {
      const rank = rankMap.get(`${n.name}:${n.gender}:${stat.year}`) ?? null
      if (rank !== null && rank < peakRank) peakRank = rank
      return { ...stat, rankThatYear: rank }
    })
    return {
      ...n,
      yearlyStats: yearlyStatsWithRank,
      peakRank: peakRank === Infinity ? n.popularityRank : peakRank,
    }
  })
}

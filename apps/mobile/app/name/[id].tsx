import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { namesApi } from '../../lib/api'
import Svg, { Path, Line, Text as SvgText, Rect } from 'react-native-svg'

const { width: W } = Dimensions.get('window')
const CHART_W = W - 48
const CHART_H = 180

function TrendChart({ stats }: { stats: Array<{ year: number; births: number }> }) {
  if (stats.length === 0) return null

  const maxBirths = Math.max(...stats.map((s) => s.births))
  const minYear = stats[0].year
  const maxYear = stats[stats.length - 1].year
  const yearRange = maxYear - minYear || 1

  const points = stats.map((s) => ({
    x: ((s.year - minYear) / yearRange) * CHART_W,
    y: CHART_H - (s.births / maxBirths) * CHART_H * 0.85,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  // Sample tick years
  const tickYears = [minYear, Math.round((minYear + maxYear) / 2), maxYear]

  return (
    <Svg width={CHART_W} height={CHART_H + 24}>
      <Path d={pathD} stroke="#8B5CF6" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {tickYears.map((y) => {
        const x = ((y - minYear) / yearRange) * CHART_W
        return (
          <SvgText key={y} x={x} y={CHART_H + 18} fontSize={11} fill="#9CA3AF" textAnchor="middle">
            {y}
          </SvgText>
        )
      })}
    </Svg>
  )
}

export default function NameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: name, isLoading } = useQuery({
    queryKey: ['name', id],
    queryFn: () => namesApi.getById(parseInt(id, 10)),
  })

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 60 }} color="#8B5CF6" />
  }

  if (!name) {
    return (
      <View style={styles.center}>
        <Text>Name not found.</Text>
      </View>
    )
  }

  const percentileLabel =
    name.popularityPercentile >= 99
      ? 'Top 1%'
      : name.popularityPercentile >= 50
      ? `Top ${Math.round(100 - name.popularityPercentile)}%`
      : `Bottom ${Math.round(name.popularityPercentile)}%`

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.heroSection}>
        <Text style={styles.heroName}>{name.name}</Text>
        <Text style={styles.heroGender}>{name.gender === 'M' ? '♂ Boy' : '♀ Girl'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>#{name.popularityRank}</Text>
          <Text style={styles.statLabel}>Current Rank</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{percentileLabel}</Text>
          <Text style={styles.statLabel}>Popularity</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>#{name.peakRank}</Text>
          <Text style={styles.statLabel}>Peak Rank</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{name.peakYear}</Text>
          <Text style={styles.statLabel}>Peak Year</Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Popularity Over Time</Text>
        <TrendChart stats={name.yearlyStats} />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Births</Text>
          <Text style={styles.infoValue}>{name.totalBirths.toLocaleString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>First Recorded</Text>
          <Text style={styles.infoValue}>{name.firstYear}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Recorded</Text>
          <Text style={styles.infoValue}>{name.lastYear}</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSection: { backgroundColor: '#8B5CF6', paddingVertical: 40, alignItems: 'center' },
  heroName: { fontSize: 52, fontWeight: '800', color: '#fff' },
  heroGender: { fontSize: 20, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: '40%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  chartSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoSection: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 15, color: '#6B7280' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
})

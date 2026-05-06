import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Bucket {
  bucketIndex: number
  count: number
  percentileStart: number
  percentileEnd: number
}

interface Props {
  buckets: Bucket[]
  low: number
  high: number
  height?: number
  activeColor?: string
  inactiveColor?: string
}

export function DistributionCurve({
  buckets,
  low,
  high,
  height = 64,
  activeColor = '#8B5CF6',
  inactiveColor = '#E5E7EB',
}: Props) {
  // Use log scale so the chart shape is visible (births span 5 orders of magnitude)
  const logCounts = useMemo(
    () => buckets.map((b) => Math.log1p(b.count)),
    [buckets]
  )
  const maxLogCount = useMemo(
    () => Math.max(...logCounts, 1),
    [logCounts]
  )

  if (!buckets.length) return null

  // Fraction of total births captured by the selected range
  const totalBirths = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets])
  const selectedBirths = useMemo(
    () => buckets.filter((b) => b.percentileStart >= low && b.percentileEnd <= high + 1)
              .reduce((s, b) => s + b.count, 0),
    [buckets, low, high]
  )
  const pct = totalBirths > 0 ? Math.round((selectedBirths / totalBirths) * 100) : 0

  return (
    <View style={styles.wrapper}>
      {/* Bar chart — log-scale heights so the power-law curve is visible */}
      <View style={[styles.chartArea, { height }]}>
        {buckets.map((bucket, i) => {
          const barH = Math.max(2, (logCounts[i] / maxLogCount) * height)
          const isActive = bucket.percentileStart >= low && bucket.percentileEnd <= high + 1
          return (
            <View
              key={bucket.bucketIndex}
              style={[
                styles.bar,
                {
                  height: barH,
                  backgroundColor: isActive ? activeColor : inactiveColor,
                  opacity: isActive ? 1 : 0.4,
                },
              ]}
            />
          )
        })}
        {/* Selection overlay lines */}
        <View style={[styles.selectionLine, { left: `${low}%` as any }]} />
        <View style={[styles.selectionLine, { left: `${high}%` as any }]} />
      </View>

      {/* Axis labels */}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>Rare</Text>
        <Text style={styles.axisLabel}>25%</Text>
        <Text style={styles.axisLabel}>50%</Text>
        <Text style={styles.axisLabel}>75%</Text>
        <Text style={styles.axisLabel}>Popular</Text>
      </View>

      {/* Selected births share */}
      <Text style={[styles.pctLabel, { color: activeColor }]}>
        {pct}% of all births in selection
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    borderRadius: 1,
  },
  selectionLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#7C3AED',
    opacity: 0.6,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  axisLabel: { fontSize: 10, color: '#9CA3AF' },
  pctLabel: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
})


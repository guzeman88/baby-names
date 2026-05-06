import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, useWindowDimensions, Platform,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { namesApi, type Name } from '../../lib/api'
import { usePreferencesStore } from '../../stores/preferencesStore'
import { RangeSlider } from '../../components/RangeSlider'
import { DistributionCurve } from '../../components/DistributionCurve'
import { NameRowSkeleton } from '../../components/Skeleton'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function NameRow({ item, lastName }: { item: Name; lastName: string }) {
  const fullName = lastName ? `${item.name} ${lastName}` : item.name
  const percentileLabel =
    item.popularityPercentile >= 99
      ? 'Top 1%'
      : item.popularityPercentile >= 90
      ? 'Top 10%'
      : `Rank #${item.popularityRank}`

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/name/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${fullName}, ${percentileLabel}`}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.nameText}>{fullName}</Text>
        <Text style={styles.genderBadge}>{item.gender === 'M' ? '♂' : '♀'}</Text>
      </View>
      <Text style={styles.rankText}>{percentileLabel}</Text>
    </TouchableOpacity>
  )
}

export default function BrowseScreen() {
  const { width } = useWindowDimensions()
  const isWide = width >= 768

  const { gender, setGender, sortBy, setSortBy, percentileRange, setPercentileRange, lastName, setLastName } =
    usePreferencesStore()
  const [lastNameInput, setLastNameInput] = useState(lastName)
  const [filterOpen, setFilterOpen] = useState(false)
  const listRef = useRef<FlashList<Name>>(null)

  // Local drag state updates instantly; committed state debounces the API query
  const [dragRange, setDragRange] = useState<[number, number]>(percentileRange)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleRangeChange = useCallback((lo: number, hi: number) => {
    setDragRange([lo, hi])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPercentileRange([lo, hi])
    }, 400)
  }, [setPercentileRange])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['names', gender, sortBy, percentileRange[0], percentileRange[1]],
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        namesApi.list({
          gender: gender === 'both' ? undefined : gender,
          sort: sortBy,
          limit: 100,
          cursor: pageParam,
          percentileMin: percentileRange[0],
          percentileMax: percentileRange[1],
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: any) => (last.hasMore ? last.nextCursor : undefined),
    })

  const { data: distData } = useQuery({
    queryKey: ['distribution', 'v3', gender],
    queryFn: () =>
      namesApi.distribution(gender === 'both' ? undefined : gender),
  })

  const allNames = data?.pages.flatMap((p: any) => p.data) ?? []
  const totalCount = data?.pages[0]?.totalCount as number | undefined

  // Section offsets for A–Z scrubber (built from server-filtered names)
  const sectionOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    allNames.forEach((n, i) => {
      const letter = n.name[0].toUpperCase()
      if (!(letter in offsets)) offsets[letter] = i
    })
    return offsets
  }, [allNames])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleScrub = useCallback(
    (letter: string) => {
      const idx = sectionOffsets[letter]
      if (idx != null) {
        listRef.current?.scrollToIndex({ index: idx, animated: true })
      }
    },
    [sectionOffsets]
  )

  const filterPanel = (
    <View style={styles.filterPanel}>
      {/* Gender */}
      <View style={styles.segmented}>
        {(['both', 'M', 'F'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.segment, gender === g && styles.segmentActive]}
            onPress={() => setGender(g)}
            accessibilityRole="button"
            accessibilityLabel={g === 'both' ? 'All' : g === 'M' ? 'Boys' : 'Girls'}
            accessibilityState={{ selected: gender === g }}
          >
            <Text style={[styles.segmentText, gender === g && styles.segmentTextActive]}>
              {g === 'both' ? 'All' : g === 'M' ? 'Boys' : 'Girls'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        {(['rank', 'alpha'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>
              {s === 'rank' ? 'Popularity' : 'A–Z'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Last name */}
      <TextInput
        style={styles.lastNameInput}
        placeholder="Preview with last name..."
        placeholderTextColor="#9CA3AF"
        value={lastNameInput}
        onChangeText={(t) => { setLastNameInput(t); setLastName(t) }}
        returnKeyType="done"
        accessibilityLabel="Last name preview"
      />

      {/* Popularity range */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Popularity range</Text>
          <Text style={styles.sliderValue}>{dragRange[0]}% – {dragRange[1]}%</Text>
        </View>
        <RangeSlider
          low={dragRange[0]}
          high={dragRange[1]}
          onChange={handleRangeChange}
        />
        {distData?.buckets && (
          <DistributionCurve
            buckets={distData.buckets}
            low={dragRange[0]}
            high={dragRange[1]}
            height={64}
          />
        )}
        <Text style={styles.countLabel}>
          {isLoading ? '…' : (totalCount ?? allNames.length).toLocaleString()} names in range
        </Text>
      </View>
    </View>
  )

  const mainContent = (
    <View style={styles.listContainer}>
      {/* Filter toggle (compact) */}
      {!isWide && (
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setFilterOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
        >
          <Text style={styles.filterToggleText}>⚙ Filters ({(totalCount ?? allNames.length).toLocaleString()} names)</Text>
        </TouchableOpacity>
      )}
      {!isWide && filterOpen && filterPanel}

      {isLoading ? (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <NameRowSkeleton key={i} />
          ))}
        </>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Failed to load names.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={allNames}
          estimatedItemSize={60}
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item }) => <NameRow item={item} lastName={lastName} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No names found. Try adjusting filters.</Text>
          }
        />
      )}
    </View>
  )

  if (isWide) {
    return (
      <View style={styles.wideContainer}>
        <View style={styles.sidebar}>{filterPanel}</View>
        <View style={styles.wideMain}>
          {mainContent}
        </View>
        <AlphabetScrubber letters={Object.keys(sectionOffsets)} onPress={handleScrub} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {mainContent}
      <AlphabetScrubber letters={Object.keys(sectionOffsets)} onPress={handleScrub} />
    </View>
  )
}

function AlphabetScrubber({ letters, onPress }: { letters: string[]; onPress: (l: string) => void }) {
  return (
    <View style={styles.scrubber} pointerEvents="box-none">
      {ALPHABET.map((letter) => (
        <TouchableOpacity
          key={letter}
          onPress={() => onPress(letter)}
          style={styles.scrubberItem}
          accessibilityRole="button"
          accessibilityLabel={`Jump to ${letter}`}
        >
          <Text style={[styles.scrubberLetter, !letters.includes(letter) && styles.scrubberInactive]}>
            {letter}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  wideContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FAFAFA' },
  sidebar: { width: 260, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 16, gap: 12 },
  wideMain: { flex: 1 },
  listContainer: { flex: 1 },
  filterToggle: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' },
  filterToggleText: { fontSize: 14, color: '#8B5CF6', fontWeight: '600' },
  filterPanel: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  segmented: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 2 },
  segment: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: '#8B5CF6' },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  segmentTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB' },
  sortBtnActive: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
  sortText: { fontSize: 13, color: '#6B7280' },
  sortTextActive: { color: '#8B5CF6', fontWeight: '600' },
  lastNameInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  sliderSection: { gap: 6 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  sliderValue: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  countLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'right' },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingRight: 44, backgroundColor: '#fff' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameText: { fontSize: 17, fontWeight: '500', color: '#111827' },
  genderBadge: { fontSize: 14, color: '#9CA3AF' },
  rankText: { fontSize: 13, color: '#8B5CF6', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 16 },
  errorBox: { alignItems: 'center', marginTop: 48, gap: 12 },
  errorText: { fontSize: 16, color: '#EF4444' },
  retryBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  scrubber: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center', gap: 0 },
  scrubberItem: { paddingHorizontal: 4, paddingVertical: 1 },
  scrubberLetter: { fontSize: 10, fontWeight: '600', color: '#8B5CF6' },
  scrubberInactive: { color: '#D1D5DB' },
})


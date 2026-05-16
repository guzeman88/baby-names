import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, runOnJS, Extrapolation,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { namesApi, swipesApi, type Name } from '../../lib/api'
import { useSwipeStore } from '../../stores/swipeStore'
import { useAuthStore } from '../../stores/authStore'
import { guestStorage } from '../../lib/guestStorage'

const { width: W, height: H } = Dimensions.get('window')
const SWIPE_THRESHOLD = W * 0.35

function NameCard({
  name,
  isTop,
  onSwipe,
}: {
  name: Name
  isTop: boolean
  onSwipe: (decision: 'LIKED' | 'PASSED') => void
}) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const triggerHaptic = (decision: 'LIKED' | 'PASSED') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        decision === 'LIKED'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {})
    }
  }

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX
      translateY.value = e.translationY * 0.2
    })
    .onEnd((e) => {
      const swipedRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > 800
      const swipedLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800

      if (swipedRight) {
        translateX.value = withTiming(W * 1.5)
        runOnJS(triggerHaptic)('LIKED')
        runOnJS(onSwipe)('LIKED')
      } else if (swipedLeft) {
        translateX.value = withTiming(-W * 1.5)
        runOnJS(triggerHaptic)('PASSED')
        runOnJS(onSwipe)('PASSED')
      } else {
        translateX.value = withSpring(0)
        translateY.value = withSpring(0)
      }
    })

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(translateX.value, [-W, 0, W], [-15, 0, 15], Extrapolation.CLAMP)}deg`,
      },
    ],
  }))

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }))

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }))

  const percentileLabel =
    name.popularityPercentile >= 99
      ? 'Top 1%'
      : name.popularityPercentile >= 90
      ? 'Top 10%'
      : `Top ${Math.round(100 - name.popularityPercentile)}%`

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, isTop && cardStyle]}>
        <Animated.View style={[styles.likeStamp, likeOpacity]}>
          <Text style={styles.likeStampText}>LIKE ❤️</Text>
        </Animated.View>
        <Animated.View style={[styles.passStamp, passOpacity]}>
          <Text style={styles.passStampText}>PASS 👋</Text>
        </Animated.View>
        <Text style={styles.cardName}>{name.name}</Text>
        <Text style={styles.cardGender}>{name.gender === 'M' ? 'Boy' : 'Girl'}</Text>
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{name.popularityRank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{percentileLabel}</Text>
            <Text style={styles.statLabel}>Popularity</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{name.peakYear}</Text>
            <Text style={styles.statLabel}>Peak Year</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

export default function SwipeScreen() {
  const { addSwipe, swipedIds } = useSwipeStore()
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showNudge, setShowNudge] = useState(false)
  const [isSlowLoad, setIsSlowLoad] = useState(false)
  const history = useRef<Array<{ name: Name; decision: 'LIKED' | 'PASSED' }>>([])
  const guestSwipeCount = useRef(0)

  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['names-swipe'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      namesApi.list({ sort: 'rank', limit: 50, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => (last.hasMore ? last.nextCursor : undefined),
  })

  // Show "waking up server" message if loading takes > 8 seconds (Render cold start)
  useEffect(() => {
    if (!isLoading) { setIsSlowLoad(false); return }
    const t = setTimeout(() => setIsSlowLoad(true), 8000)
    return () => clearTimeout(t)
  }, [isLoading])

  const allNames = (data?.pages.flatMap((p: any) => p.data) ?? []).filter(
    (n) => !swipedIds.has(n.id)
  )

  const swipeMutation = useMutation({
    mutationFn: ({ nameId, decision }: { nameId: number; decision: 'LIKED' | 'PASSED' }) =>
      swipesApi.swipe(nameId, decision),
    onError: () => {
      // Queue for offline retry handled by guestStorage
    },
  })

  const handleSwipe = useCallback(
    (name: Name, decision: 'LIKED' | 'PASSED') => {
      addSwipe(name.id, decision)
      history.current.push({ name, decision })

      if (isAuthenticated) {
        swipeMutation.mutate({ nameId: name.id, decision })
      } else {
        guestStorage.saveSwipe(name.id, decision)
        guestSwipeCount.current += 1
        if (guestSwipeCount.current === 10) setShowNudge(true)
      }

      setCurrentIndex((i) => {
        const next = i + 1
        if (next >= allNames.length - 5 && hasNextPage) fetchNextPage()
        return next
      })
    },
    [addSwipe, swipeMutation, allNames.length, hasNextPage, fetchNextPage, isAuthenticated]
  )

  const handleUndo = useCallback(() => {
    if (history.current.length === 0) return
    history.current.pop()
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])

  // Keyboard shortcuts for web
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handler = (e: Event) => {
      const ke = e as unknown as { key: string }
      const queue = allNames.slice(currentIndex, currentIndex + 3)
      if (!queue[0]) return
      if (ke.key === 'ArrowRight') handleSwipe(queue[0], 'LIKED')
      else if (ke.key === 'ArrowLeft') handleSwipe(queue[0], 'PASSED')
      else if (ke.key === 'z' || ke.key === 'Z') handleUndo()
    }
    ;(globalThis as any).window?.addEventListener('keydown', handler)
    return () => (globalThis as any).window?.removeEventListener('keydown', handler)
  }, [allNames, currentIndex, handleSwipe, handleUndo])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>
          {isSlowLoad ? 'Waking up server…\nThis takes ~30 seconds on first load' : 'Loading names…'}
        </Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Server took too long to respond.</Text>
        <Text style={[styles.errorText, { fontSize: 14, marginTop: 4, opacity: 0.7 }]}>The server may still be waking up.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const queue = allNames.slice(currentIndex, currentIndex + 3)

  if (queue.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>All caught up!</Text>
        <Text style={styles.doneSubtitle}>You've seen all available names.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => {
          history.current = []
          setCurrentIndex(0)
          refetch()
        }}>
          <Text style={styles.resetBtnText}>Start Over</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.listsBtn} onPress={() => router.push('/(tabs)/lists')}>
          <Text style={styles.listsBtnText}>View My Lists →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Account nudge for guests */}
      {showNudge && !isAuthenticated && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>💾 Save your swipes — create a free account!</Text>
          <View style={styles.nudgeActions}>
            <TouchableOpacity onPress={() => router.push('/auth?mode=register')} style={styles.nudgeBtn}>
              <Text style={styles.nudgeBtnText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNudge(false)}>
              <Text style={styles.nudgeDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Platform.OS === 'web' && (
        <Text style={styles.keyHint}>← Pass &nbsp;&nbsp; → Like &nbsp;&nbsp; Z Undo</Text>
      )}

      <View style={styles.counter}>
        <Text style={styles.counterText}>{allNames.length - currentIndex} remaining</Text>
      </View>

      <View style={styles.deck}>
        {queue
          .slice()
          .reverse()
          .map((name, i) => (
            <NameCard
              key={name.id}
              name={name}
              isTop={i === queue.length - 1}
              onSwipe={(decision) => handleSwipe(name, decision)}
            />
          ))}
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.passBtn]}
          onPress={() => queue[0] && handleSwipe(queue[0], 'PASSED')}
          accessibilityRole="button"
          accessibilityLabel="Pass"
        >
          <Text style={styles.passIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.undoBtn}
          onPress={handleUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo last swipe"
        >
          <Text style={styles.undoText}>↩ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={() => queue[0] && handleSwipe(queue[0], 'LIKED')}
          accessibilityRole="button"
          accessibilityLabel="Like"
        >
          <Text style={styles.likeIcon}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  deck: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  card: {
    position: 'absolute',
    width: W * 0.88,
    height: H * 0.55,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  likeStamp: {
    position: 'absolute', top: 32, left: 24,
    borderWidth: 3, borderColor: '#10B981', borderRadius: 8, padding: 6,
  },
  likeStampText: { color: '#10B981', fontSize: 20, fontWeight: '800' },
  passStamp: {
    position: 'absolute', top: 32, right: 24,
    borderWidth: 3, borderColor: '#EF4444', borderRadius: 8, padding: 6,
  },
  passStampText: { color: '#EF4444', fontSize: 20, fontWeight: '800' },
  cardName: { fontSize: 48, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardGender: { fontSize: 18, color: '#9CA3AF', marginBottom: 32 },
  cardStats: { flexDirection: 'row', gap: 32 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#8B5CF6' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  buttons: { flexDirection: 'row', alignItems: 'center', paddingBottom: 36, gap: 20 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  passBtn: { backgroundColor: '#FEE2E2' },
  likeBtn: { backgroundColor: '#D1FAE5' },
  passIcon: { fontSize: 28, color: '#EF4444' },
  likeIcon: { fontSize: 28, color: '#10B981' },
  undoBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  undoText: { color: '#9CA3AF', fontSize: 14 },
  doneEmoji: { fontSize: 48, marginBottom: 8 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  doneSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  resetBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  listsBtn: { marginTop: 8 },
  listsBtnText: { color: '#8B5CF6', fontWeight: '600', fontSize: 16 },
  loadingText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
  retryBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  counter: { alignItems: 'center', paddingTop: 8 },
  counterText: { fontSize: 13, color: '#9CA3AF' },
  keyHint: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, paddingTop: 4 },
  nudge: { backgroundColor: '#EDE9FE', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#DDD6FE' },
  nudgeText: { fontSize: 13, color: '#5B21B6', flex: 1, marginRight: 8 },
  nudgeActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  nudgeBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  nudgeDismiss: { color: '#8B5CF6', fontSize: 16, paddingHorizontal: 4 },
})

import { useRef } from 'react'
import { View, StyleSheet, PanResponder } from 'react-native'

const THUMB_SIZE = 22

interface Props {
  min?: number
  max?: number
  low: number
  high: number
  onChange: (low: number, high: number) => void
  trackColor?: string
  activeColor?: string
}

export function RangeSlider({
  min = 0,
  max = 100,
  low,
  high,
  onChange,
  trackColor = '#E5E7EB',
  activeColor = '#8B5CF6',
}: Props) {
  // All mutable state lives in a single ref so pan handlers always read fresh values
  const s = useRef({ low, high, trackWidth: 300, startLow: 0, startHigh: 0, onChange })
  s.current.low = low
  s.current.high = high
  s.current.onChange = onChange

  const toPos = (v: number) => ((v - min) / (max - min)) * s.current.trackWidth
  const toValue = (pos: number) =>
    Math.max(min, Math.min(max, Math.round((pos / s.current.trackWidth) * (max - min) + min)))

  const lowPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { s.current.startLow = s.current.low },
      onPanResponderMove: (_, gs) => {
        const newLow = toValue(toPos(s.current.startLow) + gs.dx)
        const clamped = Math.max(min, Math.min(newLow, s.current.high - 5))
        s.current.onChange(clamped, s.current.high)
      },
    })
  ).current

  const highPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { s.current.startHigh = s.current.high },
      onPanResponderMove: (_, gs) => {
        const newHigh = toValue(toPos(s.current.startHigh) + gs.dx)
        const clamped = Math.max(s.current.low + 5, Math.min(newHigh, max))
        s.current.onChange(s.current.low, clamped)
      },
    })
  ).current

  const lowPos = toPos(low)
  const highPos = toPos(high)

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        s.current.trackWidth = e.nativeEvent.layout.width
      }}
    >
      {/* Track */}
      <View style={[styles.track, { backgroundColor: trackColor }]} />
      {/* Active range */}
      <View
        style={[
          styles.activeTrack,
          { left: lowPos, width: highPos - lowPos, backgroundColor: activeColor },
        ]}
      />
      {/* Low thumb */}
      <View
        {...lowPanResponder.panHandlers}
        style={[styles.thumb, { left: lowPos - THUMB_SIZE / 2, borderColor: activeColor }]}
        accessibilityRole="adjustable"
        accessibilityLabel={`Minimum popularity ${low}%`}
        accessibilityValue={{ min, max, now: low }}
      />
      {/* High thumb */}
      <View
        {...highPanResponder.panHandlers}
        style={[styles.thumb, { left: highPos - THUMB_SIZE / 2, borderColor: activeColor }]}
        accessibilityRole="adjustable"
        accessibilityLabel={`Maximum popularity ${high}%`}
        accessibilityValue={{ min, max, now: high }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { height: THUMB_SIZE + 8, justifyContent: 'center', position: 'relative' },
  track: { height: 4, borderRadius: 2, position: 'absolute', left: 0, right: 0 },
  activeTrack: { height: 4, borderRadius: 2, position: 'absolute' },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
})

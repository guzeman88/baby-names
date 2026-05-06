import { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, ViewStyle } from 'react-native'

interface Props {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [anim])

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] })

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: '#E5E7EB', opacity }, style]}
    />
  )
}

export function NameRowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Skeleton width={140} height={16} />
        <Skeleton width={60} height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff' },
  left: { gap: 4 },
})

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'

export function OfflineToast() {
  const [isOffline, setIsOffline] = useState(false)
  const [opacity] = useState(new Animated.Value(0))

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)
      Animated.timing(opacity, {
        toValue: offline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
    return unsubscribe
  }, [opacity])

  if (!isOffline) return null

  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite" accessibilityLabel="No internet connection">
      <Text style={styles.toastText}>📡 No internet connection</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})

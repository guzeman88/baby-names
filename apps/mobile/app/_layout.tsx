import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Platform, StyleSheet, View } from 'react-native'
import { useAuthStore } from '../stores/authStore'
import { OfflineToast } from '../components/OfflineToast'
import { initAnalytics } from '../lib/analytics'

// Fire-and-forget — no-op if env vars are absent
initAnalytics().catch(() => {})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes — serve from cache on repeat visits
      retry: 1,
      retryDelay: 3000,
    },
  },
})

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

  useEffect(() => {
    restoreSession()
  }, [])

  // Register PWA service worker on web
  useEffect(() => {
    if (Platform.OS !== 'web') return
    // Use globalThis to avoid needing DOM lib types
    const sw = (globalThis as Record<string, unknown>).navigator as
      | { serviceWorker?: { register: (u: string) => Promise<unknown> } }
      | undefined
    sw?.serviceWorker?.register('/sw.js').catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <View style={styles.root}>
          <OfflineToast />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
            <Stack.Screen name="name/[id]" options={{ presentation: 'modal', headerShown: true, title: '' }} />
          </Stack>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

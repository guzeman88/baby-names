import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { authApi } from '../../lib/api'

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }
    authApi.verifyEmail(token).then(() => {
      setStatus('success')
    }).catch((err: any) => {
      setStatus('error')
      setMessage(err.message ?? 'This link may have expired. Please request a new verification email.')
    })
  }, [token])

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.subtitle}>Verifying your email…</Text>
      </View>
    )
  }

  if (status === 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>Email verified!</Text>
        <Text style={styles.subtitle}>Your account is now fully verified. Welcome!</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>Start Browsing</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Text style={styles.icon}>❌</Text>
      <Text style={styles.title}>Verification failed</Text>
      <Text style={styles.subtitle}>{message}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth')}>
        <Text style={styles.btnText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, textAlign: 'center' },
  btn: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

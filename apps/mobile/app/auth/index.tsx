import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

export default function AuthScreen() {
  const params = useLocalSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(
    params.mode === 'register' ? 'register' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuthStore()

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to sync your names' : 'Start saving your favorite names'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder={mode === 'register' ? 'Password (8+ chars, 1 uppercase, 1 number)' : 'Password'}
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {mode === 'login' && (
          <TouchableOpacity style={styles.switchBtn} onPress={() => router.push('/auth/forgot-password')}>
            <Text style={[styles.switchText, { color: '#6B7280' }]}>Forgot your password?</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  submitBtn: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 8 },
  switchText: { color: '#8B5CF6', fontSize: 15 },
})

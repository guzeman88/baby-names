import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { authApi } from '../../lib/api'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email.'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      // Always show success to prevent email enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          If an account exists for {email}, you'll receive a password reset link shortly.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 48, gap: 12 },
  center: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  btn: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#8B5CF6', fontSize: 15 },
})

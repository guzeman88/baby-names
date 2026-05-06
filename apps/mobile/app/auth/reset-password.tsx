import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { authApi } from '../../lib/api'

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      Alert.alert('Invalid Link', 'This reset link is invalid or expired.')
    }
  }, [token])

  const handleSubmit = async () => {
    if (!password || !confirm) { Alert.alert('Error', 'Please fill in all fields.'); return }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match.'); return }
    if (password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(password)) { Alert.alert('Error', 'Password must contain an uppercase letter.'); return }
    if (!/[0-9]/.test(password)) { Alert.alert('Error', 'Password must contain a number.'); return }

    setLoading(true)
    try {
      await authApi.resetPassword(token!, password)
      setDone(true)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'This link may have expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Password updated!</Text>
        <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth')}>
          <Text style={styles.btnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>New password</Text>
        <Text style={styles.subtitle}>Must be at least 8 characters with 1 uppercase letter and 1 number.</Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#9CA3AF"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
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
})

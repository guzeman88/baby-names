import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'

export default function ChangeEmailScreen() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  const mutation = useMutation({
    mutationFn: () => usersApi.changeEmail(currentPassword, newEmail.trim()),
    onSuccess: (updated: any) => {
      if (user) setUser({ ...user, email: updated.email, emailVerified: updated.emailVerified })
      Alert.alert('Email Updated', 'Your email has been changed. Please verify your new address.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to change email. Check your password and try again.')
    },
  })

  const isValid = currentPassword.length >= 8 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Email</Text>
      <Text style={styles.subtitle}>Enter your current password to confirm this change.</Text>

      <Text style={styles.label}>Current Password</Text>
      <TextInput
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        placeholder="Your current password"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        accessibilityLabel="Current password"
      />

      <Text style={styles.label}>New Email</Text>
      <TextInput
        style={styles.input}
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="new@email.com"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="New email address"
      />

      <TouchableOpacity
        style={[styles.btn, (!isValid || mutation.isPending) && styles.btnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={!isValid || mutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Change email"
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Update Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 24, gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  btn: { backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#9CA3AF', fontSize: 15 },
})

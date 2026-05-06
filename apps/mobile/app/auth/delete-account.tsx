import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'

export default function DeleteAccountScreen() {
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const logout = useAuthStore((s) => s.logout)

  const mutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(password),
    onSuccess: () => {
      logout()
      router.replace('/')
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to delete account. Check your password.')
    },
  })

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => mutation.mutate(),
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Account</Text>
      <Text style={styles.warning}>
        ⚠️ This will permanently delete your account and all associated data including your lists and swipe history. This cannot be undone.
      </Text>

      <Text style={styles.label}>Enter your password to confirm</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Your password"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        accessibilityLabel="Password to confirm account deletion"
      />

      <TouchableOpacity
        style={styles.confirmRow}
        onPress={() => setConfirmed((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityLabel="I understand this is permanent"
        accessibilityState={{ checked: confirmed }}
      >
        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
          {confirmed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.confirmText}>I understand this action is permanent and irreversible.</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteBtn, (!password || !confirmed || mutation.isPending) && styles.btnDisabled]}
        onPress={handleDelete}
        disabled={!password || !confirmed || mutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Delete my account"
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteBtnText}>Delete My Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#EF4444', marginBottom: 4 },
  warning: { fontSize: 15, color: '#6B7280', lineHeight: 22, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  deleteBtn: { backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { alignItems: 'center', marginTop: 4 },
  cancelText: { color: '#9CA3AF', fontSize: 15 },
})

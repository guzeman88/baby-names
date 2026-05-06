import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { usersApi } from '../../lib/api'

type GenderPref = 'BOY' | 'GIRL' | 'BOTH'
const GENDER_OPTIONS: { label: string; value: GenderPref }[] = [
  { label: 'Both', value: 'BOTH' },
  { label: 'Boys', value: 'BOY' },
  { label: 'Girls', value: 'GIRL' },
]

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, setUser } = useAuthStore()
  const [editingLastName, setEditingLastName] = useState(false)
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [saving, setSaving] = useState(false)

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  const saveLastName = async () => {
    setSaving(true)
    try {
      const updated = await usersApi.updateMe({ lastName: lastName.trim() || undefined })
      setUser(updated)
      setEditingLastName(false)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const setGenderPref = async (pref: GenderPref) => {
    if (pref === user?.genderPref) return
    try {
      const updated = await usersApi.updateMe({ genderPref: pref })
      setUser(updated)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.')
    }
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Baby Names</Text>
        <Text style={styles.subtitle}>Sign in to sync your names across devices</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth?mode=register')}>
          <Text style={styles.registerLink}>Create an account</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        {!user?.emailVerified && (
          <Text style={styles.unverified}>Email not verified</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        {/* Last Name Preview */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Last Name Preview</Text>
          {editingLastName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Smith"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveLastName}
              />
              {saving
                ? <ActivityIndicator size="small" color="#8B5CF6" style={{ marginLeft: 8 }} />
                : (
                  <>
                    <TouchableOpacity onPress={saveLastName} style={styles.saveBtn}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingLastName(false); setLastName(user?.lastName ?? '') }} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )
              }
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setLastName(user?.lastName ?? ''); setEditingLastName(true) }}>
              <Text style={styles.rowValueEdit}>{user?.lastName || 'Tap to set'} ›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Gender Pref */}
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
          <Text style={styles.rowLabel}>Show Me</Text>
          <View style={styles.segmented}>
            {GENDER_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.segment, user?.genderPref === o.value && styles.segmentActive]}
                onPress={() => setGenderPref(o.value)}
              >
                <Text style={[styles.segmentText, user?.genderPref === o.value && styles.segmentTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/auth/forgot-password')}>
          <Text style={styles.rowLabel}>Change Password</Text>
          <Text style={styles.rowValue}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => router.push('/auth/change-email')}>
          <Text style={styles.rowLabel}>Change Email</Text>
          <Text style={styles.rowValue}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/auth/delete-account')}>
          <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Delete Account</Text>
          <Text style={styles.rowValue}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  signInBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerLink: { color: '#8B5CF6', fontSize: 15, marginTop: 4 },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  email: { fontSize: 16, fontWeight: '600', color: '#111827' },
  unverified: { fontSize: 13, color: '#F59E0B', marginTop: 4 },
  section: { backgroundColor: '#fff', marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 16, color: '#111827' },
  rowValue: { fontSize: 16, color: '#6B7280' },
  rowValueEdit: { fontSize: 16, color: '#8B5CF6' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, color: '#111827', minWidth: 100 },
  saveBtn: { backgroundColor: '#8B5CF6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  cancelBtnText: { color: '#6B7280', fontSize: 13 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F9FAFB' },
  segmentActive: { backgroundColor: '#8B5CF6' },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },
  logoutBtn: { margin: 24, borderWidth: 1, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
})

import { useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { listsApi, type List } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'

function ListCard({ list }: { list: List }) {
  const typeColors: Record<string, string> = {
    LIKED: '#10B981', PASSED: '#EF4444', CUSTOM: '#8B5CF6',
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/lists/${list.id}`)}
    >
      <View style={[styles.typeIndicator, { backgroundColor: typeColors[list.type] ?? '#8B5CF6' }]} />
      <View style={styles.cardContent}>
        <Text style={styles.listName}>{list.name}</Text>
        <Text style={styles.entryCount}>{list.entryCount} names</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function ListsScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
    enabled: isAuthenticated,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => listsApi.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] })
      setNewName('')
      setShowCreate(false)
    },
    onError: () => Alert.alert('Error', 'Failed to create list. Please try again.'),
  })

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    createMutation.mutate(trimmed)
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.authTitle}>Sign in to save lists</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#8B5CF6" />
  }

  const lists = data?.lists ?? []

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListCard list={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 80 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No lists yet. Start swiping to create some!</Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreate(true)}
        accessibilityRole="button"
        accessibilityLabel="Create new list"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create list modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New List</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="List name…"
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              accessibilityLabel="List name"
            />
            <TouchableOpacity
              style={[styles.createBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              <Text style={styles.createBtnText}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  authTitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
  authBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  authBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 16 },
  typeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  cardContent: { flex: 1 },
  listName: { fontSize: 17, fontWeight: '600', color: '#111827' },
  entryCount: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 16, paddingHorizontal: 24 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 32, color: '#fff', lineHeight: 36 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sheetInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  createBtn: { backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})

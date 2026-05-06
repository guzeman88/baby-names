import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listsApi } from '../../lib/api'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import SwipeableItem, { useSwipeableItemParams } from 'react-native-swipeable-item'
import Animated from 'react-native-reanimated'
import { useState, useCallback, useRef } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

type Entry = {
  entryId: string
  position: number
  addedAt: string
  name: { id: number; name: string; gender: string; popularityRank: number }
}

function DeleteUnderlayer({ item, listId, onDelete }: { item: Entry; listId: string; onDelete: (id: string) => void }) {
  const { close } = useSwipeableItemParams<Entry>()
  return (
    <Animated.View style={styles.deleteUnderlayer}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          close()
          Alert.alert('Remove', `Remove "${item.name.name}" from this list?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => onDelete(item.entryId) },
          ])
        }}
      >
        <Text style={styles.deleteButtonText}>Remove</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['list', id],
    queryFn: () => listsApi.getById(id),
  })

  const [entries, setEntries] = useState<Entry[]>([])
  const didInitRef = useRef(false)

  if (data?.entries && !didInitRef.current) {
    didInitRef.current = true
    setEntries(data.entries as Entry[])
  }

  const reorderMutation = useMutation({
    mutationFn: (newEntries: Entry[]) =>
      listsApi.reorder(
        id,
        newEntries.map((e, i) => ({ entryId: e.entryId, position: (i + 1) * 1000 }))
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list', id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (nameId: number) => listsApi.removeEntry(id, nameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      didInitRef.current = false
    },
  })

  const handleDragEnd = useCallback(({ data }: { data: Entry[] }) => {
    setEntries(data)
    reorderMutation.mutate(data)
  }, [])

  const handleDelete = useCallback((entryId: string) => {
    const entry = entries.find((e) => e.entryId === entryId)
    if (entry) {
      setEntries((prev) => prev.filter((e) => e.entryId !== entryId))
      removeMutation.mutate(entry.name.id)
    }
  }, [entries])

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Entry>) => {
    return (
      <ScaleDecorator>
        <SwipeableItem
          key={item.entryId}
          item={item}
          renderUnderlayLeft={() => (
            <DeleteUnderlayer item={item} listId={id} onDelete={handleDelete} />
          )}
          snapPointsLeft={[90]}
          overSwipe={20}
        >
          <TouchableOpacity
            style={[styles.row, isActive && styles.rowActive]}
            onPress={() => router.push(`/name/${item.name.id}`)}
            onLongPress={drag}
            delayLongPress={150}
            accessibilityLabel={`${item.name.name}, rank ${item.name.popularityRank}. Long press to reorder.`}
          >
            <View style={styles.dragHandle}>
              <Text style={styles.dragIcon}>☰</Text>
            </View>
            <View style={styles.nameInfo}>
              <Text style={styles.nameText}>{item.name.name}</Text>
              <Text style={styles.subText}>Rank #{item.name.popularityRank}</Text>
            </View>
            <Text style={styles.genderBadge}>{item.name.gender === 'M' ? '♂' : '♀'}</Text>
          </TouchableOpacity>
        </SwipeableItem>
      </ScaleDecorator>
    )
  }, [handleDelete, id])

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#8B5CF6" />
  }

  const list = data?.list

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{list?.name}</Text>
        <Text style={styles.count}>{list?.entryCount} names</Text>
      </View>
      <Text style={styles.hint}>Long press to reorder · Swipe left to remove</Text>
      <DraggableFlatList
        data={entries}
        keyExtractor={(item) => item.entryId}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No names in this list yet.</Text>
        }
        activationDistance={10}
      />
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  count: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  hint: { fontSize: 12, color: '#C4B5FD', textAlign: 'center', paddingVertical: 6, backgroundColor: '#F5F3FF' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16 },
  rowActive: { backgroundColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  dragHandle: { marginRight: 12 },
  dragIcon: { fontSize: 18, color: '#D1D5DB' },
  nameInfo: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: '500', color: '#111827' },
  subText: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  genderBadge: { fontSize: 18, color: '#9CA3AF' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 16 },
  deleteUnderlayer: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#FEE2E2' },
  deleteButton: { width: 90, height: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
})

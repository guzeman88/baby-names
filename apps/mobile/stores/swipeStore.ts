import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SwipeState {
  swipedIds: Set<number>
  decisions: Record<number, 'LIKED' | 'PASSED'>
  addSwipe: (nameId: number, decision: 'LIKED' | 'PASSED') => void
  hydrate: (ids: number[], decisions: Record<string, 'LIKED' | 'PASSED'>) => void
  hasDecision: (nameId: number) => boolean
  clearAll: () => void
}

// Zustand can't persist a Set natively, so we store it as an array in AsyncStorage
// and convert on rehydration.
export const useSwipeStore = create<SwipeState>()(
  persist(
    (set, get) => ({
      swipedIds: new Set(),
      decisions: {},

      hydrate: (ids, decisions) => {
        const decisionMap: Record<number, 'LIKED' | 'PASSED'> = {}
        for (const [k, v] of Object.entries(decisions)) {
          decisionMap[parseInt(k, 10)] = v
        }
        set({ swipedIds: new Set(ids), decisions: decisionMap })
      },

      addSwipe: (nameId, decision) => {
        set((state) => ({
          swipedIds: new Set([...state.swipedIds, nameId]),
          decisions: { ...state.decisions, [nameId]: decision },
        }))
      },

      hasDecision: (nameId) => get().swipedIds.has(nameId),

      clearAll: () => set({ swipedIds: new Set(), decisions: {} }),
    }),
    {
      name: 'swipes',
      storage: createJSONStorage(() => AsyncStorage),
      // Serialize Set → array, deserialize array → Set
      partialize: (state) => ({
        swipedIdsArray: [...state.swipedIds],
        decisions: state.decisions,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        swipedIds: new Set<number>((persisted?.swipedIdsArray as number[]) ?? []),
        decisions: persisted?.decisions ?? {},
      }),
    }
  )
)

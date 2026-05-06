import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PreferencesState {
  gender: 'M' | 'F' | 'both'
  sortBy: 'alpha' | 'rank'
  percentileRange: [number, number]
  lastName: string
  setGender: (g: 'M' | 'F' | 'both') => void
  setSortBy: (s: 'alpha' | 'rank') => void
  setPercentileRange: (r: [number, number]) => void
  setLastName: (name: string) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      gender: 'both',
      sortBy: 'rank',
      percentileRange: [0, 100],
      lastName: '',
      setGender: (gender) => set({ gender }),
      setSortBy: (sortBy) => set({ sortBy }),
      setPercentileRange: (percentileRange) => set({ percentileRange }),
      setLastName: (lastName) => set({ lastName }),
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

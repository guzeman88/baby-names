/**
 * Guest storage utilities for persisting swipe decisions and preferences
 * without requiring a user account. Uses AsyncStorage under the hood.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const GUEST_SWIPES_KEY = 'guest:swipes'

export interface GuestSwipe {
  nameId: number
  decision: 'LIKED' | 'PASSED'
  ts: number
}

export const guestStorage = {
  async saveSwipe(nameId: number, decision: 'LIKED' | 'PASSED'): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_SWIPES_KEY)
      const existing: GuestSwipe[] = raw ? JSON.parse(raw) : []
      existing.push({ nameId, decision, ts: Date.now() })
      await AsyncStorage.setItem(GUEST_SWIPES_KEY, JSON.stringify(existing))
    } catch {
      // non-critical, silently fail
    }
  },

  async getSwipes(): Promise<GuestSwipe[]> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_SWIPES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  async clearSwipes(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GUEST_SWIPES_KEY)
    } catch {}
  },
}

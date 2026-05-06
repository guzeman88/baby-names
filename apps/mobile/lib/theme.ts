import { useColorScheme } from 'react-native'

export const palette = {
  purple: '#8B5CF6',
  purpleDark: '#7C3AED',
  purpleLight: '#EDE9FE',
  green: '#10B981',
  red: '#EF4444',
}

const light = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  accent: palette.purple,
  accentBg: palette.purpleLight,
  danger: palette.red,
  success: palette.green,
}

const dark = {
  background: '#111827',
  surface: '#1F2937',
  border: '#374151',
  borderLight: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#6B7280',
  accent: '#A78BFA',
  accentBg: '#2D2244',
  danger: '#F87171',
  success: '#34D399',
}

export type Theme = typeof light

export function useTheme(): Theme {
  const scheme = useColorScheme()
  return scheme === 'dark' ? dark : light
}

import Constants from 'expo-constants'

// EXPO_PUBLIC_API_URL is baked in at build time (set in Vercel/CI env vars).
// Falls back to the production Render URL, then localhost for local dev.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'https://babynames-api.onrender.com/v1'

let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Network error' } }))
    throw new ApiError(res.status, error?.error?.message ?? 'Unknown error', error?.error?.code)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
}

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    api.post<{ user: User; accessToken: string }>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post<{ user: User; accessToken: string }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
}

// Names API
export const namesApi = {
  list: (params: NamesListParams) => {
    const q = new URLSearchParams()
    if (params.gender) q.set('gender', params.gender)
    if (params.sort) q.set('sort', params.sort)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.cursor) q.set('cursor', params.cursor)
    if (params.percentileMin !== undefined) q.set('percentileMin', String(params.percentileMin))
    if (params.percentileMax !== undefined) q.set('percentileMax', String(params.percentileMax))
    return api.get<NamesListResponse>(`/names?${q}`)
  },
  getById: (id: number) => api.get<NameWithStats>(`/names/${id}`),
  distribution: (gender?: 'M' | 'F') => {
    const qs = gender ? `?gender=${gender}` : ''
    return api.get<Distribution>(`/names/distribution${qs}`)
  },
}

// Swipes API
export const swipesApi = {
  getHistory: () => api.get<SwipeHistory>('/swipes/history'),
  swipe: (nameId: number, decision: 'LIKED' | 'PASSED') =>
    api.post('/swipes', { nameId, decision }),
  batchSwipe: (swipes: Array<{ nameId: number; decision: 'LIKED' | 'PASSED' }>) =>
    api.post('/swipes/batch', { swipes }),
}

// Lists API
export const listsApi = {
  getAll: () => api.get<{ lists: List[] }>('/lists'),
  create: (name: string) => api.post<{ list: List }>('/lists', { name }),
  getById: (id: string) => api.get<ListDetail>(`/lists/${id}`),
  rename: (id: string, name: string) => api.patch(`/lists/${id}`, { name }),
  delete: (id: string) => api.delete(`/lists/${id}`),
  addEntry: (listId: string, nameId: number) =>
    api.post(`/lists/${listId}/entries`, { nameId }),
  removeEntry: (listId: string, nameId: number) =>
    api.delete(`/lists/${listId}/entries/${nameId}`),
  reorder: (listId: string, entries: { entryId: string; position: number }[]) =>
    api.patch(`/lists/${listId}/entries/reorder`, { entries }),
}

// Users API
export const usersApi = {
  getMe: () => api.get<User>('/users/me'),
  updateMe: (data: Partial<{ lastName: string; genderPref: string }>) =>
    api.patch<User>('/users/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),
  changeEmail: (currentPassword: string, newEmail: string) =>
    api.patch('/users/me/email', { currentPassword, newEmail }),
  deleteAccount: (password: string) =>
    api.delete('/users/me', { password, confirm: true }),
}

// Types
export interface User {
  id: string
  email: string
  emailVerified: boolean
  lastName?: string
  genderPref: 'BOY' | 'GIRL' | 'BOTH'
  createdAt: string
}

export interface Name {
  id: number
  name: string
  gender: 'M' | 'F'
  popularityRank: number
  popularityPercentile: number
  peakRank: number
  peakYear: number
}

export interface NameWithStats extends Name {
  totalBirths: number
  recentBirths: number
  firstYear: number
  lastYear: number
  yearlyStats: Array<{ year: number; births: number; rankThatYear?: number }>
}

export interface NamesListParams {
  gender?: 'M' | 'F' | 'both'
  sort?: 'alpha' | 'rank'
  limit?: number
  cursor?: string
  percentileMin?: number
  percentileMax?: number
}

export interface NamesListResponse {
  data: Name[]
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
}

export interface Distribution {
  gender: string
  totalNames: number
  buckets: Array<{ bucketIndex: number; count: number; percentileStart: number; percentileEnd: number }>
  referenceWindow: { startYear: number; endYear: number }
}

export interface SwipeHistory {
  swipedNameIds: number[]
  decisions: Record<string, 'LIKED' | 'PASSED'>
}

export interface List {
  id: string
  name: string
  type: 'LIKED' | 'PASSED' | 'CUSTOM'
  entryCount: number
  createdAt: string
  updatedAt: string
}

export interface ListDetail {
  list: List
  entries: Array<{
    entryId: string
    position: number
    addedAt: string
    name: Name
  }>
  nextCursor: string | null
  hasMore: boolean
}

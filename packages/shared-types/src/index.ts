import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
})

// ─── User ─────────────────────────────────────────────────────────────────────

export const GenderPrefSchema = z.enum(['BOY', 'GIRL', 'BOTH'])
export type GenderPref = z.infer<typeof GenderPrefSchema>

export const UpdateUserSchema = z.object({
  lastName: z.string().max(50).optional(),
  genderPref: GenderPrefSchema.optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
})

export const DeleteAccountSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal(true),
})

// ─── Names ────────────────────────────────────────────────────────────────────

export const GenderSchema = z.enum(['M', 'F'])
export type Gender = z.infer<typeof GenderSchema>

export const SortSchema = z.enum(['alpha', 'rank'])
export type Sort = z.infer<typeof SortSchema>

export const NamesQuerySchema = z.object({
  gender: z.union([GenderSchema, z.literal('both')]).optional(),
  sort: SortSchema.optional().default('rank'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
})

// ─── Swipes ───────────────────────────────────────────────────────────────────

export const SwipeDecisionSchema = z.enum(['LIKED', 'PASSED'])
export type SwipeDecision = z.infer<typeof SwipeDecisionSchema>

export const SwipeSchema = z.object({
  nameId: z.number().int().positive(),
  decision: SwipeDecisionSchema,
})

export const BatchSwipeSchema = z.object({
  swipes: z.array(SwipeSchema).min(1).max(500),
})

// ─── Lists ────────────────────────────────────────────────────────────────────

export const CreateListSchema = z.object({
  name: z.string().min(1).max(100),
})

export const RenameListSchema = z.object({
  name: z.string().min(1).max(100),
})

export const AddListEntrySchema = z.object({
  nameId: z.number().int().positive(),
})

export const ReorderEntriesSchema = z.object({
  entries: z.array(z.object({
    entryId: z.string().uuid(),
    position: z.number().int().positive(),
  })).min(1),
})

// ─── Shared types (no Zod, plain TS) ─────────────────────────────────────────

export interface UserDTO {
  id: string
  email: string
  emailVerified: boolean
  lastName?: string
  genderPref: GenderPref
  createdAt: string
}

export interface NameDTO {
  id: number
  name: string
  gender: Gender
  popularityRank: number
  popularityPercentile: number
  peakRank: number
  peakYear: number
}

export interface NameDetailDTO extends NameDTO {
  totalBirths: number
  recentBirths: number
  firstYear: number
  lastYear: number
  yearlyStats: Array<{ year: number; births: number; rankThatYear?: number }>
}

export interface ListDTO {
  id: string
  name: string
  type: 'LIKED' | 'PASSED' | 'CUSTOM'
  entryCount: number
  createdAt: string
  updatedAt: string
}

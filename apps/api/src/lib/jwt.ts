import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret'
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES_DAYS = 30

export interface AccessTokenPayload {
  sub: string
  email: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES as any })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function refreshTokenExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS)
  return d
}

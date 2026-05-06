import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
      secure: false,
      ignoreTLS: process.env.NODE_ENV !== 'production',
    } as nodemailer.TransportOptions)
  }
  return transporter
}

const FROM = process.env.SMTP_FROM ?? 'noreply@babyname.app'
const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:8081'

export async function sendVerificationEmail(email: string, token: string) {
  if (process.env.NODE_ENV === 'test') return
  const url = `${FRONTEND}/auth/verify-email?token=${token}`
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Verify your BabyName account',
      html: `<p>Click <a href="${url}">here</a> to verify your email address.</p>`,
    })
  } catch {
    // Email failure is non-fatal in dev
    console.warn('[Email] Failed to send verification email')
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (process.env.NODE_ENV === 'test') return
  const url = `${FRONTEND}/auth/reset-password?token=${token}`
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Reset your BabyName password',
      html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    })
  } catch {
    console.warn('[Email] Failed to send password reset email')
  }
}

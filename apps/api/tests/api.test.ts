import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../src/index.js'
import { prisma } from '../src/lib/db.js'

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})

describe('GET /v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
  })
})

describe('Auth routes', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'TestPass1'
  let accessToken = ''

  beforeEach(async () => {
    // Clean up test user if exists
    await prisma.user.deleteMany({ where: { email: testEmail } })
  })

  it('POST /v1/auth/register creates a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: testEmail, password: testPassword },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.user.email).toBe(testEmail)
    expect(body.accessToken).toBeTruthy()
    accessToken = body.accessToken
  })

  it('POST /v1/auth/register rejects duplicate email', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: testEmail, password: testPassword } })
    const res = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: testEmail, password: testPassword } })
    expect(res.statusCode).toBe(409)
  })

  it('POST /v1/auth/register rejects weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'other@test.com', password: 'weak' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /v1/auth/login succeeds with correct credentials', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: testEmail, password: testPassword } })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: testEmail, password: testPassword },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.accessToken).toBeTruthy()
  })

  it('POST /v1/auth/login fails with wrong password', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: testEmail, password: testPassword } })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: testEmail, password: 'WrongPass1' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('Names routes', () => {
  it('GET /v1/names/distribution returns 100 buckets', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/names/distribution?gender=F' })
    // May return 200 with empty data if no names loaded, or 200 with data
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.buckets).toHaveLength(100)
  })

  it('GET /v1/names returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/names?gender=F&limit=10' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('Protected routes require auth', () => {
  it('GET /v1/users/me returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/users/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /v1/swipes/history returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/swipes/history' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── Helper ───────────────────────────────────────────────────────────────────

async function createAndLogin(email: string, password = 'TestPass1') {
  await prisma.user.deleteMany({ where: { email } })
  const res = await app.inject({
    method: 'POST', url: '/v1/auth/register',
    payload: { email, password },
  })
  expect(res.statusCode).toBe(201)
  const { accessToken } = JSON.parse(res.body)
  return accessToken as string
}

// ─── Users routes ─────────────────────────────────────────────────────────────

describe('Users routes', () => {
  let token = ''
  const email = `users-test-${Date.now()}@example.com`

  beforeAll(async () => {
    token = await createAndLogin(email)
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } })
  })

  it('GET /v1/users/me returns user', async () => {
    const res = await app.inject({
      method: 'GET', url: '/v1/users/me',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.email).toBe(email)
    expect(body.genderPref).toBe('BOTH')
  })

  it('PATCH /v1/users/me updates lastName and genderPref', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/v1/users/me',
      headers: { Authorization: `Bearer ${token}` },
      payload: { lastName: 'Smith', genderPref: 'BOY' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.lastName).toBe('Smith')
    expect(body.genderPref).toBe('BOY')
  })
})

// ─── Swipes routes ────────────────────────────────────────────────────────────

describe('Swipes routes', () => {
  let token = ''
  let nameId: number
  const email = `swipes-test-${Date.now()}@example.com`

  beforeAll(async () => {
    token = await createAndLogin(email)
    // Get a real name from the DB
    const name = await prisma.name.findFirst()
    if (!name) throw new Error('No names in DB — run seed first')
    nameId = name.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } })
  })

  it('GET /v1/swipes/history returns empty initially', async () => {
    const res = await app.inject({
      method: 'GET', url: '/v1/swipes/history',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.swipedNameIds).toEqual([])
  })

  it('POST /v1/swipes records a LIKED decision', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/swipes',
      headers: { Authorization: `Bearer ${token}` },
      payload: { nameId, decision: 'LIKED' },
    })
    expect([200, 201]).toContain(res.statusCode)
  })

  it('GET /v1/swipes/history reflects recorded swipe', async () => {
    const res = await app.inject({
      method: 'GET', url: '/v1/swipes/history',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.swipedNameIds).toContain(nameId)
    expect(body.decisions[nameId]).toBe('LIKED')
  })

  it('DELETE /v1/swipes/:nameId removes the swipe', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/v1/swipes/${nameId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })
})

// ─── Lists routes ─────────────────────────────────────────────────────────────

describe('Lists routes', () => {
  let token = ''
  let listId = ''
  let nameId: number
  const email = `lists-test-${Date.now()}@example.com`

  beforeAll(async () => {
    token = await createAndLogin(email)
    const name = await prisma.name.findFirst()
    if (!name) throw new Error('No names in DB — run seed first')
    nameId = name.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } })
  })

  it('GET /v1/lists returns system lists', async () => {
    const res = await app.inject({
      method: 'GET', url: '/v1/lists',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.lists)).toBe(true)
    const types = body.lists.map((l: any) => l.type)
    expect(types).toContain('LIKED')
    expect(types).toContain('PASSED')
  })

  it('POST /v1/lists creates a custom list', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/lists',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Favorites' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.list.name).toBe('Favorites')
    expect(body.list.type).toBe('CUSTOM')
    listId = body.list.id
  })

  it('POST /v1/lists/:id/entries adds a name to the list', async () => {
    const res = await app.inject({
      method: 'POST', url: `/v1/lists/${listId}/entries`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { nameId },
    })
    expect(res.statusCode).toBe(201)
  })

  it('GET /v1/lists/:id returns list with entries', async () => {
    const res = await app.inject({
      method: 'GET', url: `/v1/lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.list.id).toBe(listId)
    expect(body.entries.length).toBeGreaterThan(0)
    expect(body.entries[0].name.id).toBe(nameId)
  })

  it('PATCH /v1/lists/:id renames the list', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/v1/lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Top Picks' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.list.name).toBe('Top Picks')
  })

  it('DELETE /v1/lists/:id/entries/:nameId removes entry', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/v1/lists/${listId}/entries/${nameId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('DELETE /v1/lists/:id deletes the list', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/v1/lists/${listId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })
})

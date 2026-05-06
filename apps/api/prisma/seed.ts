import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SAMPLE_NAMES_F = [
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery',
  'Sofia', 'Camila', 'Aria', 'Scarlett', 'Victoria', 'Madison', 'Luna', 'Grace',
  'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora',
]

const SAMPLE_NAMES_M = [
  'Liam', 'Noah', 'William', 'James', 'Oliver', 'Benjamin', 'Elijah', 'Lucas',
  'Mason', 'Logan', 'Alexander', 'Ethan', 'Jacob', 'Michael', 'Daniel', 'Henry',
  'Jackson', 'Sebastian', 'Aiden', 'Matthew', 'Samuel', 'David', 'Joseph', 'Carter',
  'Owen', 'Wyatt', 'John', 'Jack', 'Luke', 'Jayden',
]

async function seed() {
  console.log('Seeding database...')

  // Create test user
  const passwordHash = await bcrypt.hash('TestPass1', 12)
  const user = await prisma.user.upsert({
    where: { email: 'test@babynames.dev' },
    update: {},
    create: {
      email: 'test@babynames.dev',
      passwordHash,
      emailVerified: true,
      lastName: 'Smith',
      genderPref: 'BOTH',
    },
  })
  console.log(`Created user: ${user.email}`)

  // Create system lists for test user
  const liked = await prisma.list.upsert({
    where: { id: `seed-liked-${user.id}` },
    update: {},
    create: { id: `seed-liked-${user.id}`, userId: user.id, name: 'Liked', type: 'LIKED' },
  }).catch(() =>
    prisma.list.findFirst({ where: { userId: user.id, type: 'LIKED' } })
  )

  const passed = await prisma.list.upsert({
    where: { id: `seed-passed-${user.id}` },
    update: {},
    create: { id: `seed-passed-${user.id}`, userId: user.id, name: 'Passed', type: 'PASSED' },
  }).catch(() =>
    prisma.list.findFirst({ where: { userId: user.id, type: 'PASSED' } })
  )

  // Seed female names
  let fRank = 1
  for (const name of SAMPLE_NAMES_F) {
    const totalBirths = Math.floor(Math.random() * 200000) + 5000
    const recentBirths = Math.floor(totalBirths * 0.1)
    const percentile = ((SAMPLE_NAMES_F.length - fRank) / SAMPLE_NAMES_F.length) * 100

    const n = await prisma.name.upsert({
      where: { name_gender: { name, gender: 'F' } },
      update: {},
      create: {
        name, gender: 'F',
        popularityRank: fRank,
        popularityPercentile: Math.round(percentile * 100) / 100,
        totalBirths, recentBirths,
        peakRank: Math.max(1, fRank - Math.floor(Math.random() * 5)),
        peakYear: 2010 + Math.floor(Math.random() * 10),
        firstYear: 1920 + Math.floor(Math.random() * 40),
        lastYear: 2024,
      },
    })

    // Add some yearly stats
    for (let year = 2000; year <= 2024; year++) {
      await prisma.nameYearlyStat.upsert({
        where: { nameId_year: { nameId: n.id, year } },
        update: {},
        create: {
          nameId: n.id, year,
          births: Math.floor(Math.random() * 10000) + 500,
          rankThatYear: fRank + Math.floor(Math.random() * 10) - 5,
        },
      })
    }
    fRank++
  }
  console.log(`Seeded ${SAMPLE_NAMES_F.length} female names`)

  // Seed male names
  let mRank = 1
  for (const name of SAMPLE_NAMES_M) {
    const totalBirths = Math.floor(Math.random() * 200000) + 5000
    const recentBirths = Math.floor(totalBirths * 0.1)
    const percentile = ((SAMPLE_NAMES_M.length - mRank) / SAMPLE_NAMES_M.length) * 100

    const n = await prisma.name.upsert({
      where: { name_gender: { name, gender: 'M' } },
      update: {},
      create: {
        name, gender: 'M',
        popularityRank: mRank,
        popularityPercentile: Math.round(percentile * 100) / 100,
        totalBirths, recentBirths,
        peakRank: Math.max(1, mRank - Math.floor(Math.random() * 5)),
        peakYear: 2010 + Math.floor(Math.random() * 10),
        firstYear: 1920 + Math.floor(Math.random() * 40),
        lastYear: 2024,
      },
    })

    // Add some yearly stats
    for (let year = 2000; year <= 2024; year++) {
      await prisma.nameYearlyStat.upsert({
        where: { nameId_year: { nameId: n.id, year } },
        update: {},
        create: {
          nameId: n.id, year,
          births: Math.floor(Math.random() * 10000) + 500,
          rankThatYear: mRank + Math.floor(Math.random() * 10) - 5,
        },
      })
    }
    mRank++
  }
  console.log(`Seeded ${SAMPLE_NAMES_M.length} male names`)
  console.log('Seed complete!')
}

seed()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

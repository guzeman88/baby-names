import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SAMPLE_NAMES_F = [
  // Top 1–50
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery',
  'Sofia', 'Camila', 'Aria', 'Scarlett', 'Victoria', 'Madison', 'Luna', 'Grace',
  'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor',
  'Hannah', 'Lillian', 'Addison', 'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe',
  'Leah', 'Hazel', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella',
  'Claire', 'Skylar',
  // 51–100
  'Lucy', 'Paisley', 'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia', 'Kennedy',
  'Samantha', 'Maya', 'Willow', 'Kinsley', 'Naomi', 'Aaliyah', 'Elena', 'Gianna',
  'Valentina', 'Isla', 'Eva', 'Serenity', 'Autumn', 'Ruby', 'Piper', 'Sydney',
  'Alexa', 'Sadie', 'Lydia', 'Julia', 'Sophie', 'Katherine', 'Alice', 'Hailey',
  'Kayla', 'Kylie', 'Jasmine', 'Margaret', 'Brielle', 'Sienna', 'Ariana', 'Natalia',
  'Mary', 'Brianna', 'Melody', 'Faith', 'Peyton', 'Quinn', 'Andrea', 'Bailey',
  'Juliana', 'Nevaeh',
  // 101–150
  'Hadley', 'Alexandra', 'Isabelle', 'Taylor', 'Jade', 'Jocelyn', 'Annabelle',
  'Madeline', 'Paige', 'Gabriella', 'Eliana', 'Adalyn', 'Reagan', 'Melanie',
  'Vera', 'Alexis', 'Arabella', 'Adeline', 'Sloane', 'Emery', 'Ivy', 'London',
  'Trinity', 'Brynn', 'Reese', 'Alayna', 'Felicity', 'Cora', 'Lila', 'Clara',
  'Celeste', 'Genevieve', 'Iris', 'Juniper', 'Lena', 'Nadia', 'Ophelia', 'Phoebe',
  'Rosalie', 'Sabrina', 'Serena', 'Tessa', 'Thea', 'Vivian', 'Wren', 'Imogen',
  'Ada', 'Elsa', 'Fiona', 'Ingrid',
  // 151–200
  'Jolene', 'Kira', 'Laurel', 'Margot', 'Odette', 'Paloma', 'Rosalyn', 'Talia',
  'Valencia', 'Whitney', 'Yasmin', 'Zara', 'Amara', 'Bianca', 'Cassandra', 'Diana',
  'Estelle', 'Flora', 'Gemma', 'Harriet', 'Josephine', 'Keira', 'Lorena', 'Miriam',
  'Nadine', 'Octavia', 'Rafaela', 'Scarlet', 'Ursula', 'Xiomara', 'Yvette', 'Zelda',
  'Anastasia', 'Beatrice', 'Cecilia', 'Delilah', 'Evangeline', 'Francesca', 'Gwendolyn',
  'Helena', 'Isadora', 'Jacqueline', 'Katarina', 'Lavinia', 'Marisol', 'Nicolette',
  'Oriana', 'Priscilla', 'Rosemary', 'Savanna',
  // 201–250
  'Tabitha', 'Ulrica', 'Vivienne', 'Winona', 'Xenia', 'Yara', 'Zinnia', 'Adriana',
  'Bethany', 'Callie', 'Daphne', 'Edith', 'Fatima', 'Gracie', 'Heather', 'Ines',
  'Joanna', 'Kaitlyn', 'Leila', 'Magdalena', 'Nathalie', 'Olympia', 'Penelope',
  'Quincy', 'Rebecca', 'Selena', 'Tatiana', 'Uma', 'Valentina', 'Wilhelmina',
  'Xiomara', 'Yelena', 'Zola', 'Alana', 'Blythe', 'Camille', 'Delia', 'Elena',
  'Fleur', 'Greta', 'Hana', 'Iliana', 'Jillian', 'Kimberly', 'Lyra', 'Mina',
  'Nina', 'Odelia', 'Petra',
  // 251–300
  'Rosanna', 'Sibyl', 'Theresa', 'Vanda', 'Xandra', 'Yolanda', 'Zara', 'Agatha',
  'Bonnie', 'Chiara', 'Dina', 'Eleanora', 'Fabiola', 'Georgia', 'Holly', 'Ilse',
  'Jana', 'Katelyn', 'Lara', 'Mora', 'Nora', 'Odile', 'Portia', 'Raquel',
  'Solange', 'Tamara', 'Ulrike', 'Veda', 'Xanthe', 'Yuki', 'Zara', 'Alicia',
  'Brenda', 'Celia', 'Donna', 'Erica', 'Faye', 'Gloria', 'Heidi', 'Irene',
  'Janet', 'Karen', 'Lisa', 'Monica', 'Nancy', 'Olivia', 'Patricia', 'Rachel',
  'Sandra', 'Teresa',
]

const SAMPLE_NAMES_M = [
  // Top 1–50
  'Liam', 'Noah', 'William', 'James', 'Oliver', 'Benjamin', 'Elijah', 'Lucas',
  'Mason', 'Logan', 'Alexander', 'Ethan', 'Jacob', 'Michael', 'Daniel', 'Henry',
  'Jackson', 'Sebastian', 'Aiden', 'Matthew', 'Samuel', 'David', 'Joseph', 'Carter',
  'Owen', 'Wyatt', 'John', 'Jack', 'Luke', 'Jayden', 'Dylan', 'Grayson', 'Levi',
  'Isaac', 'Gabriel', 'Julian', 'Mateo', 'Anthony', 'Jaxon', 'Lincoln', 'Joshua',
  'Christopher', 'Andrew', 'Theodore', 'Caleb', 'Ryan', 'Asher', 'Nathan', 'Thomas',
  'Leo', 'Isaiah',
  // 51–100
  'Charles', 'Josiah', 'Hudson', 'Christian', 'Hunter', 'Connor', 'Eli', 'Ezra',
  'Aaron', 'Landon', 'Adrian', 'Jonathan', 'Nolan', 'Jeremiah', 'Easton', 'Colton',
  'Cameron', 'Carson', 'Robert', 'Angel', 'Maverick', 'Nicholas', 'Dominic',
  'Greyson', 'Adam', 'Ian', 'Austin', 'Evan', 'Wesley', 'Cooper', 'Xavier',
  'Parker', 'Roman', 'Miles', 'Jason', 'Ayden', 'Kevin', 'Declan', 'Braxton',
  'Bentley', 'Zachary', 'Victor', 'Colin', 'Brandon', 'Damian', 'Harrison',
  'Gavin', 'Jesus', 'Blake', 'Maxwell',
  // 101–150
  'Luca', 'Ashton', 'Micah', 'Tristan', 'Bryce', 'Alex', 'Cole', 'Cesar',
  'Patrick', 'Jameson', 'Tyler', 'Louis', 'Sawyer', 'Caden', 'Hayden', 'Brooks',
  'Ryder', 'Justin', 'Vincent', 'Tucker', 'Jonah', 'Jordan', 'Beau', 'Enzo',
  'Elliot', 'Xander', 'Spencer', 'Knox', 'Emmett', 'Rowan', 'Silas', 'Dean',
  'Zane', 'Colt', 'Dallas', 'Elias', 'Finn', 'Griffin', 'Harris', 'Ivan',
  'Joel', 'Kingston', 'Lance', 'Marco', 'Nash', 'Oscar', 'Pierce', 'Quinn',
  'Remy', 'Soren',
  // 151–200
  'Thiago', 'Ulric', 'Vaughn', 'Wade', 'Xander', 'York', 'Zack', 'Abel',
  'Barrett', 'Cade', 'Drake', 'Emilio', 'Felix', 'Grant', 'Hugo', 'Ike',
  'Jace', 'Kade', 'Lane', 'Milo', 'Nico', 'Otto', 'Penn', 'Rafael',
  'Sterling', 'Tatum', 'Uriah', 'Vance', 'Warren', 'Xavier', 'Yusuf', 'Zion',
  'Ace', 'Bishop', 'Cruz', 'Dax', 'Everett', 'Ford', 'Gage', 'Hayes',
  'Ivor', 'Jett', 'Keegan', 'Leland', 'Maximus', 'Nate', 'Oakley', 'Pax',
  'Reid', 'Steele',
  // 201–250
  'Talon', 'Upton', 'Viggo', 'Wallace', 'Xavi', 'Yale', 'Zander', 'Alec',
  'Baxter', 'Clint', 'Dillon', 'Earl', 'Frank', 'Grady', 'Heath', 'Irvin',
  'Jerome', 'Kenneth', 'Lloyd', 'Marcus', 'Neil', 'Omar', 'Percy', 'Reese',
  'Stuart', 'Tobias', 'Uri', 'Vernon', 'Wesley', 'Xenos', 'Yuri', 'Zeb',
  'Alfred', 'Bernard', 'Claude', 'Douglas', 'Ernest', 'Floyd', 'George',
  'Harold', 'Irving', 'Jeffrey', 'Karl', 'Lawrence', 'Maurice', 'Norman',
  'Phillip', 'Raymond', 'Stanley', 'Ted',
  // 251–300
  'Ulysses', 'Victor', 'Walter', 'Xavier', 'Yosef', 'Zachary', 'Ahmad', 'Brad',
  'Caleb', 'Derek', 'Eddie', 'Fritz', 'Gerard', 'Hank', 'Irving', 'Jimmy',
  'Kurt', 'Luther', 'Marvin', 'Ned', 'Orlando', 'Preston', 'Ralph', 'Scott',
  'Terry', 'Umar', 'Vito', 'Wayne', 'Xander', 'Yancy', 'Zebediah', 'Allen',
  'Bruce', 'Calvin', 'Dennis', 'Eugene', 'Francis', 'Glenn', 'Howard', 'Ivan',
  'Jerry', 'Keith', 'Leonard', 'Martin', 'Nathan', 'Orville', 'Paul', 'Roger',
  'Stephen', 'Timothy',
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

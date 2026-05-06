# SSA Data Pipeline Specification
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Data Engineer

---

## 1. Overview

The Social Security Administration (SSA) publishes national baby name data annually. This pipeline downloads, processes, and loads that data into the application's PostgreSQL database, then computes derived metrics (popularity ranks, percentiles, distribution histograms) used throughout the app.

The pipeline lives in the monorepo at `packages/data-pipeline/` and is runnable via a single command. It is designed to be idempotent — running it multiple times produces the same result.

---

## 2. Data Source

| Property | Value |
|---|---|
| **Source** | U.S. Social Security Administration |
| **URL** | https://www.ssa.gov/oact/babynames/names.zip |
| **Format** | ZIP archive containing one `.txt` file per year |
| **File naming** | `yob{YEAR}.txt` (e.g., `yob2023.txt`) |
| **File format** | CSV, no header row: `name,sex,births` |
| **Coverage** | 1880–present (new year added ~April/May annually) |
| **Minimum threshold** | Only names with ≥ 5 births in a given year are included |
| **Size** | ~30MB uncompressed, ~7MB compressed |
| **License** | Public domain (U.S. government data) |

### Sample file content (`yob2023.txt`):
```
Olivia,F,17728
Emma,F,14459
Charlotte,F,13215
...
Liam,M,18995
Noah,M,18218
...
Zzander,M,5
```

---

## 3. Pipeline Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    DATA PIPELINE                          │
│                                                           │
│  1. DOWNLOAD        2. EXTRACT        3. PARSE            │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │ Fetch    │─────►│ Unzip    │─────►│ Parse    │         │
│  │ names.zip│      │ to /tmp  │      │ CSVs     │         │
│  └──────────┘      └──────────┘      └────┬─────┘         │
│                                           │               │
│  4. AGGREGATE       5. COMPUTE      ◄─────┘               │
│  ┌──────────┐      ┌──────────┐                           │
│  │ Aggregate│◄─────│ Validate │                           │
│  │ by name/ │      │ & clean  │                           │
│  │ gender   │      └──────────┘                           │
│  └────┬─────┘                                             │
│       │                                                   │
│  6. RANK & PERCENTILE   7. LOAD         8. POST-PROCESS   │
│  ┌──────────┐          ┌──────────┐    ┌──────────┐       │
│  │ Compute  │─────────►│ Upsert   │───►│ Compute  │       │
│  │ ranks    │          │ to DB    │    │ histograms│      │
│  │ & pctile │          │ (batched)│    │ Warm cache│      │
│  └──────────┘          └──────────┘    └──────────┘       │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Pipeline Steps (Detailed)

### Step 1: Download

```typescript
// packages/data-pipeline/src/steps/download.ts

const SSA_URL = 'https://www.ssa.gov/oact/babynames/names.zip';
const DOWNLOAD_PATH = path.join(os.tmpdir(), 'ssa-names.zip');

async function download(): Promise<void> {
  // Stream download to avoid loading 30MB into memory
  const response = await fetch(SSA_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const fileStream = fs.createWriteStream(DOWNLOAD_PATH);
  await pipeline(response.body, fileStream);
  console.log(`Downloaded to ${DOWNLOAD_PATH}`);
}
```

**Error handling:**
- Retry up to 3 times on network error with exponential backoff
- Fail fast if HTTP status is not 2xx
- Verify the downloaded file is a valid ZIP (check magic bytes: `PK\x03\x04`)

---

### Step 2: Extract

Extract all `.txt` files from the ZIP into a temporary directory.

```typescript
async function extract(zipPath: string): Promise<string> {
  const extractDir = path.join(os.tmpdir(), 'ssa-names-extracted');
  await fs.rm(extractDir, { recursive: true, force: true });
  await fs.mkdir(extractDir);
  // Use the 'unzipper' or 'adm-zip' npm package
  await extractZip(zipPath, { dir: extractDir });
  const files = await fs.readdir(extractDir);
  const yearFiles = files.filter(f => /^yob\d{4}\.txt$/.test(f));
  console.log(`Extracted ${yearFiles.length} year files`);
  return extractDir;
}
```

---

### Step 3: Parse & Validate

Parse each year file and validate records.

```typescript
interface RawRecord {
  name: string;
  gender: 'M' | 'F';
  births: number;
  year: number;
}

async function parseYearFile(filePath: string, year: number): Promise<RawRecord[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const records: RawRecord[] = [];

  for (const line of content.trim().split('\n')) {
    const [name, sex, birthsStr] = line.split(',');

    // Validation
    if (!name || !sex || !birthsStr) continue;
    if (!/^[A-Za-z'-]+$/.test(name)) continue;  // Skip malformed names
    if (sex !== 'M' && sex !== 'F') continue;
    const births = parseInt(birthsStr, 10);
    if (isNaN(births) || births < 5) continue;  // SSA guarantees ≥5 but be safe

    records.push({
      name: name.trim(),
      gender: sex as 'M' | 'F',
      births,
      year,
    });
  }
  return records;
}
```

**Data anomalies to handle:**
- Names with apostrophes (e.g., `O'Brien`) — keep as-is
- Names with hyphens (e.g., `Mary-Jane`) — keep as-is
- Duplicate name/gender in same year file — sum the births (extremely rare, shouldn't happen in SSA data but guard against it)
- Very old years (pre-1924) may have sparser data — include all, no minimum year cutoff
- Some years may have a `NationalReadMe.pdf` in the archive — skip non-.txt files

---

### Step 4: Aggregate

Aggregate all records into two data structures:

```typescript
// Structure 1: Yearly stats per name/gender
type YearlyStats = Map<string, Map<number, number>>;
// key: "Abigail:F", value: Map<year, births>

// Structure 2: Total births per name/gender (all time)
type TotalBirths = Map<string, number>;
// key: "Abigail:F", value: total_births_all_time
```

This aggregation happens in memory (all data fits in ~500MB RAM).

---

### Step 5: Compute Reference Window Metrics

The reference window is configurable (default: last 10 complete calendar years).

```typescript
const REFERENCE_WINDOW_YEARS = 10;

interface NameMetrics {
  key: string;        // "Abigail:F"
  name: string;
  gender: 'M' | 'F';
  recentBirths: number;   // Sum of births in reference window
  totalBirths: number;    // Sum of births all time
  peakRank: number;       // Best (lowest number) rank ever achieved
  peakYear: number;
  firstYear: number;
  lastYear: number;
}

function computeMetrics(
  yearlyStats: YearlyStats,
  referenceWindowStartYear: number,
  referenceWindowEndYear: number
): Map<string, NameMetrics> {
  // ... implementation
}
```

---

### Step 6: Compute Ranks and Percentiles

Within each gender, sort names by `recentBirths` descending and assign ranks and percentiles.

```typescript
function computeRanksAndPercentiles(
  metrics: NameMetrics[],
  gender: 'M' | 'F'
): NameMetrics[] {
  const genderMetrics = metrics
    .filter(m => m.gender === gender)
    .sort((a, b) => b.recentBirths - a.recentBirths);

  const total = genderMetrics.length;

  return genderMetrics.map((m, index) => ({
    ...m,
    popularityRank: index + 1,
    // Percentile: 100 = most popular, 0 = least popular
    // (total - rank) / total * 100, floored to 2 decimal places
    popularityPercentile: Math.round(((total - (index + 1)) / total) * 10000) / 100,
  }));
}
```

**Percentile definition:**
- `popularityPercentile = ((total - rank) / total) × 100`
- The most popular name (rank 1) gets percentile ≈ 100.
- The least popular name (rank N) gets percentile ≈ 0.
- This matches the slider UX where 100th percentile = most popular.

---

### Step 7: Per-Year Rank Computation

For the trend chart, each name also needs its rank within its gender for each specific year.

```typescript
// For each year, compute rank of each name within gender
// This produces the 'rankThatYear' field in name_yearly_stats
function computeYearlyRanks(allRecords: RawRecord[]): Map<string, Map<number, number>> {
  // Group by year, then by gender, sort by births, assign rank
  // Returns Map<"Abigail:F", Map<year, rankThatYear>>
}
```

*Note: Year-specific ranking is separate from the reference-window ranking. The year-rank is used only in the trend chart tooltip.*

---

### Step 8: Load to Database

Use PostgreSQL's `COPY` or Prisma's `createMany` with `skipDuplicates` for efficient bulk loading.

```typescript
async function loadToDatabase(
  client: PrismaClient,
  namesData: ProcessedName[],
  yearlyData: ProcessedYearlyStat[]
): Promise<void> {

  console.log('Clearing existing name data...');
  // Use a transaction to ensure atomicity
  await client.$transaction(async (tx) => {
    // Delete yearly stats first (FK constraint)
    await tx.nameYearlyStat.deleteMany({});
    await tx.name.deleteMany({});

    console.log(`Loading ${namesData.length} names...`);
    // Batch insert in chunks of 1000 to avoid parameter limits
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < namesData.length; i += CHUNK_SIZE) {
      await tx.name.createMany({
        data: namesData.slice(i, i + CHUNK_SIZE),
      });
      process.stdout.write(`\r  Names: ${Math.min(i + CHUNK_SIZE, namesData.length)}/${namesData.length}`);
    }

    console.log(`\nLoading ${yearlyData.length} yearly stats...`);
    for (let i = 0; i < yearlyData.length; i += CHUNK_SIZE) {
      await tx.nameYearlyStat.createMany({
        data: yearlyData.slice(i, i + CHUNK_SIZE),
      });
      process.stdout.write(`\r  Yearly stats: ${Math.min(i + CHUNK_SIZE, yearlyData.length)}/${yearlyData.length}`);
    }
  });

  console.log('\nDatabase load complete.');
}
```

**Transaction:** The entire name data load is wrapped in a single transaction. If any step fails, the database is left in its previous state. This ensures the app remains functional during a failed pipeline run.

---

### Step 9: Post-Processing

After loading to the database:

1. **Compute and cache distribution histograms** in Redis (for `/names/distribution` endpoint).
2. **Invalidate all Redis name caches** so the API serves fresh data.
3. **Log pipeline run metadata** (total names loaded, reference window years, duration).

```typescript
async function postProcess(redis: Redis): Promise<void> {
  console.log('Computing distribution histograms...');
  // Compute histogram for M and F, store in Redis
  await computeAndCacheDistribution(redis, 'M');
  await computeAndCacheDistribution(redis, 'F');

  console.log('Invalidating name caches...');
  const keysToDelete = await redis.keys('names:*');
  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }

  console.log('Post-processing complete.');
}
```

---

## 5. Distribution Histogram Computation

The histogram for the distribution curve is computed server-side during post-processing.

```typescript
async function computeAndCacheDistribution(
  redis: Redis,
  gender: 'M' | 'F'
): Promise<void> {
  // Fetch all percentiles for this gender from DB
  const names = await prisma.name.findMany({
    where: { gender },
    select: { popularityPercentile: true },
  });

  const buckets = new Array(100).fill(0);
  for (const { popularityPercentile } of names) {
    const bucket = Math.min(Math.floor(popularityPercentile), 99);
    buckets[bucket]++;
  }

  await redis.set(
    `names:dist:${gender}`,
    JSON.stringify(buckets),
    'EX',
    86400  // 24 hours
  );
}
```

---

## 6. Pipeline CLI Interface

The pipeline is a Node.js CLI script.

```bash
# Full pipeline (download + process + load + post-process)
npm run pipeline:run --workspace=packages/data-pipeline

# Re-run post-processing only (e.g., if only Redis was cleared)
npm run pipeline:post-process --workspace=packages/data-pipeline

# Dry run (parse and validate, do not write to DB)
npm run pipeline:dry-run --workspace=packages/data-pipeline

# Use a locally cached ZIP (skip download)
npm run pipeline:run --workspace=packages/data-pipeline -- --local-zip=/path/to/names.zip

# Override reference window
npm run pipeline:run --workspace=packages/data-pipeline -- --ref-years=5
```

### Environment Variables for Pipeline

```bash
DATABASE_URL=postgresql://user:pass@host:5432/babyname
REDIS_URL=redis://localhost:6379
PIPELINE_REF_WINDOW_YEARS=10   # Number of years for reference window (default: 10)
PIPELINE_DRY_RUN=false
```

---

## 7. Expected Runtime & Output

| Step | Estimated Time | Notes |
|---|---|---|
| Download | 10–30s | Depends on network |
| Extract | < 5s | |
| Parse all year files | 30–60s | ~140 files |
| Aggregate | < 10s | In-memory |
| Compute ranks/percentiles | < 5s | In-memory |
| Compute yearly ranks | 60–120s | CPU-intensive |
| DB load (names) | 30–60s | ~100k rows |
| DB load (yearly stats) | 5–10 min | ~5M rows |
| Post-processing | < 30s | |
| **Total** | **~10–15 min** | |

---

## 8. Data Quality Checks

Before completing the pipeline, run these validation checks and fail loudly if any are violated:

```typescript
const checks = [
  {
    name: 'Minimum name count (female)',
    check: () => femaleNames.length > 60_000,
    message: 'Expected > 60,000 female names'
  },
  {
    name: 'Minimum name count (male)',
    check: () => maleNames.length > 35_000,
    message: 'Expected > 35,000 male names'
  },
  {
    name: 'Most recent year present',
    check: () => maxYear >= new Date().getFullYear() - 1,
    message: 'Missing data for recent year'
  },
  {
    name: 'Known popular names present',
    check: () => {
      const olivia = processedNames.find(n => n.name === 'Olivia' && n.gender === 'F');
      return olivia && olivia.popularityPercentile > 95;
    },
    message: 'Olivia (F) should be above 95th percentile'
  },
  {
    name: 'Percentile range valid',
    check: () => processedNames.every(n => n.popularityPercentile >= 0 && n.popularityPercentile <= 100),
    message: 'Percentiles out of range'
  },
  {
    name: 'No duplicate name/gender pairs',
    check: () => {
      const keys = processedNames.map(n => `${n.name}:${n.gender}`);
      return new Set(keys).size === keys.length;
    },
    message: 'Duplicate name/gender pairs found'
  },
];
```

---

## 9. Annual Update Process

1. SSA typically releases updated data in April/May each year.
2. Monitor for the new release (can check the `last-modified` header on the SSA URL).
3. Run the pipeline: `npm run pipeline:run`.
4. Review the post-pipeline data quality check output.
5. Verify that the new year's data is present by checking `SELECT MAX(year) FROM name_yearly_stats;`
6. Monitor API error logs for 24 hours after the update.

---

## 10. Pipeline Directory Structure

```
packages/data-pipeline/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── steps/
│   │   ├── download.ts
│   │   ├── extract.ts
│   │   ├── parse.ts
│   │   ├── aggregate.ts
│   │   ├── compute-ranks.ts
│   │   ├── compute-yearly-ranks.ts
│   │   ├── load-database.ts
│   │   └── post-process.ts
│   ├── validate.ts           # Data quality checks
│   ├── lib/
│   │   ├── db.ts             # Prisma client init
│   │   └── redis.ts          # Redis client init
│   └── types.ts
├── package.json
└── tsconfig.json
```

import { loadEnvFileIfPresent } from "./load-env.js"

loadEnvFileIfPresent()

import { getDb } from "../db/client.js"

type LatestRow = {
  asin: string
  title: string | null
  price: number | null
  currency: string | null
  availability: string | null
  rating: number | null
  reviewsCount: number | null
  url: string | null
  scrapedAt: string
}

const ASINS = ["B0CJ8ZHMVF", "B0BZHTVHN5"]
const DAYS = 14

const toNumber = (value: unknown): number | null => {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

const toStringOrNull = (value: unknown): string | null => {
  if (value == null) return null
  return String(value)
}

const round2 = (n: number): number => Math.round(n * 100) / 100

const hashRand = (seed: number, index: number): number => {
  const x = Math.sin(seed * 1000 + index * 97.173) * 10000
  return x - Math.floor(x)
}

const buildDailyPrices = (
  latestPrice: number,
  days: number,
  productIndex: number,
): number[] => {
  // Keep price mostly flat and apply at most two small drops in 14 days.
  const dropCount = productIndex === 0 ? 2 : 1
  const dropDays =
    dropCount === 2
      ? [Math.floor(days * 0.35), Math.floor(days * 0.72)]
      : [Math.floor(days * 0.58)]

  const dropAmounts =
    dropCount === 2
      ? [round2(latestPrice * 0.004), round2(latestPrice * 0.003)]
      : [round2(latestPrice * 0.005)]

  const totalDrops = dropAmounts.reduce((acc, value) => acc + value, 0)
  let current = round2(latestPrice + totalDrops)
  const prices: number[] = []

  for (let i = 0; i < days; i++) {
    const dropIdx = dropDays.indexOf(i)
    if (dropIdx >= 0) {
      current = round2(current - dropAmounts[dropIdx])
    }

    prices.push(i === days - 1 ? latestPrice : current)
  }

  return prices
}

const getLatestByAsin = async (asin: string): Promise<LatestRow | null> => {
  const db = getDb()
  const result = await db.execute({
    sql: `
      SELECT
        asin,
        title,
        price,
        currency,
        availability,
        rating,
        reviews_count,
        url,
        scraped_at
      FROM price_snapshots
      WHERE asin = ? AND price IS NOT NULL
      ORDER BY scraped_at DESC
      LIMIT 1
    `,
    args: [asin],
  })

  if (result.rows.length === 0) return null
  const row = result.rows[0]

  return {
    asin: String(row.asin),
    title: toStringOrNull(row.title),
    price: toNumber(row.price),
    currency: toStringOrNull(row.currency),
    availability: toStringOrNull(row.availability),
    rating: toNumber(row.rating),
    reviewsCount: toNumber(row.reviews_count),
    url: toStringOrNull(row.url),
    scrapedAt: String(row.scraped_at),
  }
}

const main = async () => {
  const db = getDb()
  let inserted = 0
  let deleted = 0

  for (const [productIndex, asin] of ASINS.entries()) {
    const latest = await getLatestByAsin(asin)
    if (!latest || latest.price == null) {
      throw new Error(`No hay snapshot base para ${asin}`)
    }

    const end = new Date(latest.scrapedAt)
    const start = new Date(end.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000)
    const stepMs = 24 * 60 * 60 * 1000

    const timeline: string[] = []
    for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
      timeline.push(new Date(t).toISOString())
    }

    const deleteResult = await db.execute({
      sql: `
        DELETE FROM price_snapshots
        WHERE asin = ?
      `,
      args: [asin],
    })
    deleted += Number(deleteResult.rowsAffected ?? 0)

    const currentReviews = latest.reviewsCount ?? 0
    const maxStepBack = productIndex === 0 ? 2 : 3
    const dailyPrices = buildDailyPrices(latest.price, DAYS, productIndex)

    // Build reviews so older snapshots have fewer reviews than newer ones.
    const reviewsSeries: number[] = new Array(timeline.length)
    reviewsSeries[timeline.length - 1] = currentReviews

    for (let i = timeline.length - 2; i >= 0; i--) {
      const r = hashRand(100 + productIndex, i)
      const dec = Math.floor(r * (maxStepBack + 1))
      reviewsSeries[i] = Math.max(0, reviewsSeries[i + 1] - dec)
    }

    for (let i = 0; i < timeline.length; i++) {
      const ts = timeline[i]
      const syntheticPrice = dailyPrices[i]
      const syntheticRating = latest.rating ?? 4.5

      await db.execute({
        sql: `
          INSERT INTO price_snapshots (
            asin,
            title,
            price,
            currency,
            availability,
            rating,
            reviews_count,
            url,
            scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          asin,
          latest.title,
          syntheticPrice,
          latest.currency,
          latest.availability,
          syntheticRating,
          reviewsSeries[i],
          latest.url,
          ts,
        ],
      })

      inserted++
    }

    console.log(
      JSON.stringify(
        {
          asin,
          start: start.toISOString(),
          end: end.toISOString(),
          points: timeline.length,
          deletedForAsin: Number(deleteResult.rowsAffected ?? 0),
        },
        null,
        2,
      ),
    )
  }

  console.log(JSON.stringify({ inserted, deleted }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

import { getDb } from "./client.js"

export type ProductSnapshot = {
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

export type PriceRow = {
  asin: string
  title: string | null
  price: number
  currency: string | null
  url: string | null
  availability: string | null
  rating: number | null
  reviewsCount: number | null
  scrapedAt: string
}

export const saveSnapshot = async (snapshot: ProductSnapshot) => {
  const db = getDb()

  await db.execute({
    sql: `
      INSERT INTO price_snapshots (
        asin, title, price, currency,
        availability, rating, reviews_count,
        url, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      snapshot.asin,
      snapshot.title,
      snapshot.price,
      snapshot.currency,
      snapshot.availability,
      snapshot.rating,
      snapshot.reviewsCount,
      snapshot.url,
      snapshot.scrapedAt,
    ],
  })
}

export const getAllSnapshots = async (): Promise<PriceRow[]> => {
  const db = getDb()

  const result = await db.execute(`
    SELECT
      asin, scraped_at, price, currency,
      title, url, availability, rating, reviews_count
    FROM price_snapshots
    WHERE price IS NOT NULL
    ORDER BY scraped_at ASC
  `)

  return result.rows
    .map((row) => ({
      asin: String(row.asin),
      scrapedAt: String(row.scraped_at),
      price: typeof row.price === "number" ? row.price : Number(row.price),
      currency: row.currency ? String(row.currency) : null,
      title: row.title ? String(row.title) : null,
      url: row.url ? String(row.url) : null,
      availability: row.availability ? String(row.availability) : null,
      rating: row.rating != null ? Number(row.rating) : null,
      reviewsCount: row.reviews_count != null ? Number(row.reviews_count) : null,
    }))
    .filter((row) => Number.isFinite(row.price))
}

export const getHistoryByAsin = async (asin: string): Promise<PriceRow[]> => {
  const db = getDb()

  const result = await db.execute({
    sql: `
      SELECT
        asin, scraped_at, price, currency,
        title, url, availability, rating, reviews_count
      FROM price_snapshots
      WHERE asin = ? AND price IS NOT NULL
      ORDER BY scraped_at ASC
    `,
    args: [asin],
  })

  return result.rows
    .map((row) => ({
      asin: String(row.asin),
      scrapedAt: String(row.scraped_at),
      price: typeof row.price === "number" ? row.price : Number(row.price),
      currency: row.currency ? String(row.currency) : null,
      title: row.title ? String(row.title) : null,
      url: row.url ? String(row.url) : null,
      availability: row.availability ? String(row.availability) : null,
      rating: row.rating != null ? Number(row.rating) : null,
      reviewsCount: row.reviews_count != null ? Number(row.reviews_count) : null,
    }))
    .filter((row) => Number.isFinite(row.price))
}

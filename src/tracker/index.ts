process.loadEnvFile()

import { initDb } from "../db/schema.js"
import { saveSnapshot } from "../db/queries.js"
import { scrapeProduct } from "./scraper.js"


const getAsins = (): string[] => {
  const raw = process.env.AMAZON_ASINS ?? ""
  const asins = raw
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)

  if (asins.length === 0) {
    throw new Error("No hay ASINs configurados en AMAZON_ASINS")
  }

  return asins
}

const main = async () => {
  await initDb()

  const asins = getAsins()

  console.log(`Tracking ${asins.length} producto(s)...\n`)

  for (const asin of asins) {
    try {
      const snapshot = await scrapeProduct(asin)
      await saveSnapshot(snapshot)

      console.log({
        asin: snapshot.asin,
        title: snapshot.title,
        price: snapshot.price,
        currency: snapshot.currency,
        availability: snapshot.availability,
        scrapedAt: snapshot.scrapedAt,
      })
    } catch (error) {
      console.error({
        asin,
        error: error instanceof Error ? error.message : "Error desconocido",
      })
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

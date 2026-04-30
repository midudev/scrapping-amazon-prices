import { loadEnvFileIfPresent } from "./load-env.js"

loadEnvFileIfPresent()

import { scrapeProduct } from "./scraper.js"
import { initDb } from "../db/schema.js"
import { saveSnapshot } from "../db/queries.js"

const getAsins = (): string[] => {
  const raw = process.env.AMAZON_ASINS ?? ""
  const asins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (asins.length === 0) {
    throw new Error("No hay ASINs configurados en AMAZON_ASINS")
  }

  return asins
}

const main = async () => {
  const asins = getAsins()

  await initDb()

  console.log("Scraping manual de Amazon usando Proxy + API (Decodo)")
  console.log("Proveedor: Decodo Scraper API")
  console.log(`ASINs objetivo: ${asins.join(", ")}`)

  for (const asin of asins) {
    console.log(`\n→ [Proxy] Solicitando ${asin} vía Decodo...`)

    try {
      const data = await scrapeProduct(asin)

      console.log(`  [Proxy OK] ${data.asin}`)
      console.log(`  Título:   ${data.title ?? "no encontrado"}`)
      console.log(`  Precio:   ${data.price ?? "no encontrado"} ${data.currency ?? ""}`)
      console.log(`  Rating:   ${data.rating ?? "no encontrado"}`)
      console.log(`  Reviews:  ${data.reviewsCount ?? "no encontrado"}`)
      console.log(`  Stock:    ${data.availability ?? "no encontrado"}`)
      console.log(`  URL:      ${data.url ?? "no encontrada"}`)
      console.log(`  Scraped:  ${data.scrapedAt}`)

      await saveSnapshot(data)
      console.log(`  [DB] Snapshot guardado en la base de datos`)
    } catch (error) {
      console.error(`  [Proxy ERROR] ${error instanceof Error ? error.message : error}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
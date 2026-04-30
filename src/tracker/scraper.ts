process.loadEnvFile()

import type { ProductSnapshot } from "../db/queries.js"
import type { DecodoApiResponse } from "./types.js"
import { toNumber, toInteger } from "./utils.js"

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  MÓDULO INTERCAMBIABLE DE SCRAPING
 *
 *  Este archivo es el único que necesitas cambiar para
 *  usar otro proveedor de scraping o tu propia lógica.
 *
 *  Contrato: exportar scrapeProduct(asin) → ProductSnapshot
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const getDecodoAuth = (): string => {
  const token = process.env.DECODO_AUTH_TOKEN

  if (!token) {
    throw new Error("Falta DECODO_AUTH_TOKEN")
  }

  return `Basic ${token}`
}

export const scrapeProduct = async (asin: string): Promise<ProductSnapshot> => {
  const response = await fetch("https://scraper-api.decodo.com/v2/scrape", {
    method: "POST",
    body: JSON.stringify({
      "target": "amazon_product",
      "query": asin,
      "domain": "es",
      "parse": true
    }),
    headers: {
      "Content-Type": "application/json",
      "Authorization": getDecodoAuth()
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Decodo error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as DecodoApiResponse
  const item = data.results?.[0]?.content?.results

  return {
    asin: item?.asin ?? asin,
    title: item?.title ?? item?.product_name ?? null,
    price: toNumber(item?.price),
    currency: item?.currency ?? null,
    availability: item?.availability ?? item?.stock ?? null,
    rating: toNumber(item?.rating),
    reviewsCount: toInteger(item?.reviews_count),
    url: item?.url ?? null,
    scrapedAt: new Date().toISOString(),
  }
}

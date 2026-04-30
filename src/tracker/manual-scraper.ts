import { loadEnvFileIfPresent } from "./load-env.js"

loadEnvFileIfPresent()

import { writeFileSync } from "node:fs"

const asins = (process.env.AMAZON_ASINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
const store = process.env.AMAZON_STORE ?? "es"
const domain = `www.amazon.${store}`

async function scrape(asin: string) {
  const url = `https://${domain}/dp/${asin}`
  console.log(`\n→ ${url}`)

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  })

  if (!response.ok) {
    throw new Error(`Status ${response.status}`)
  }

  const html = await response.text()

  writeFileSync(`${asin}.log`, html)
  console.log(`  HTML guardado en ${asin}.log (${(html.length / 1024).toFixed(0)} KB)`)

  if (html.includes("captcha")) {
    throw new Error("CAPTCHA detectado — Amazon nos ha bloqueado")
  }

  // <span id="productTitle" class="...">   Título del producto   </span>
  const titleMatch = html.match(/id="productTitle"[^>]*>\s*([^<]+)/)
  const title = titleMatch?.[1]?.trim() ?? null

  // <input type="hidden" id="twister-plus-price-data-price" value="429.99" />
  const priceMatch = html.match(/id="twister-plus-price-data-price"\s+value="([\d.]+)"/)
  const price = priceMatch ? parseFloat(priceMatch[1]) : null

  // <input type="hidden" id="twister-plus-price-data-price-unit" value="€" />
  const unitMatch = html.match(/id="twister-plus-price-data-price-unit"\s+value="([^"]+)"/)
  const currency = unitMatch?.[1] ?? null

  // <span id="acrPopover" ... title="4,7 de 5 estrellas">
  const ratingMatch = html.match(/id="acrPopover"[^>]*title="(\d[.,]\d)\s+de\s+5/)
  const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(",", ".")) : null

  // <span id="acrCustomerReviewText" aria-label="2.613 Reseñas">
  const reviewsMatch = html.match(/id="acrCustomerReviewText"[^>]*aria-label="([\d.,]+)\s/)
  const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/[.,]/g, ""), 10) : null

  // <div id="availability" ...> <span ...> En stock </span> </div>
  const availabilityMatch = html.match(/id="availability"[\s\S]*?<span[^>]*>\s*([^<]+)/)
  const availability = availabilityMatch?.[1]?.trim() ?? null

  return { asin, title, price, currency, rating, reviewsCount, availability, url, scrapedAt: new Date().toISOString() }
}

async function main() {
  console.log("Scraping manual de Amazon (sin proxy, sin API)")
  console.log(`Store: ${domain} — ASINs: ${asins.join(", ")}`)

  for (const asin of asins) {
    try {
      const data = await scrape(asin)

      console.log(`  Título:   ${data.title ?? "no encontrado"}`)
      console.log(`  Precio:   ${data.price ?? "no encontrado"} ${data.currency ?? ""}`)
      console.log(`  Rating:   ${data.rating ?? "no encontrado"}`)
      console.log(`  Reviews:  ${data.reviewsCount ?? "no encontrado"}`)
      console.log(`  Stock:    ${data.availability ?? "no encontrado"}`)
    } catch (error) {
      console.error(`  ERROR: ${error instanceof Error ? error.message : error}`)
    }
  }
}

main()

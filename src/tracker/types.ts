export type DecodoApiResponse = {
  results?: Array<{
    content?: {
      asin?: string
      title?: string
      price?: number | string
      currency?: string
      availability?: string
      url?: string
      rating?: number | string
      reviews_count?: number | string
    }
  }>
}

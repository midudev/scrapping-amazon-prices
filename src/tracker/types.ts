export type DecodoProduct = {
  asin?: string
  title?: string
  product_name?: string
  price?: number | string
  currency?: string
  availability?: string
  stock?: string
  url?: string
  rating?: number | string
  reviews_count?: number | string
}

export type DecodoWrappedResult = {
  results?: DecodoProduct
  errors?: unknown[]
  status_code?: number
  task_id?: string
}

export type DecodoApiResponse = {
  errors?: unknown[]
  status_code?: number
  task_id?: string
  results?: Array<{
    content?: DecodoWrappedResult
  }>
}

export type PaginationInput = {
  page?: number
  limit?: number
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginationMeta
}

/**
 * Normalizes pagination query values and caps the page size to keep admin list APIs predictable.
 */
export function normalizePagination(input: PaginationInput = {}) {
  const page = Math.max(1, Number(input.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(input.limit ?? 20)))
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

/**
 * Wraps a list query result with stable pagination metadata for frontend tables.
 */
export function buildPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

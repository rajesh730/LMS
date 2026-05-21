export function parsePagination(searchParams, defaults = {}) {
  const defaultPage = defaults.page || 1;
  const defaultLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 100;

  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || defaultPage, 10) || defaultPage
  );
  const requestedLimit =
    Number.parseInt(searchParams.get("limit") || defaultLimit, 10) ||
    defaultLimit;
  const limit = Math.min(Math.max(1, requestedLimit), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPagination({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(total, safePage * limit);

  return {
    page: safePage,
    currentPage: safePage,
    limit,
    total,
    totalItems: total,
    totalPages,
    start,
    end,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

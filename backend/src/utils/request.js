export function requestContext(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: (req.get('user-agent') || '').slice(0, 255) || null,
  };
}

export function paginate(query, { defaultSize = 20, maxSize = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number.parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const pageMeta = (page, pageSize, total) => ({ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

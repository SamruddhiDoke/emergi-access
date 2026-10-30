export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required', code = 'UNAUTHENTICATED') => new AppError(401, code, message);
export const forbidden = (message = 'You do not have permission to perform this action', code = 'FORBIDDEN') => new AppError(403, code, message);
export const notFound = (message = 'Resource not found', code = 'NOT_FOUND') => new AppError(404, code, message);
export const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);
export const gone = (message, code = 'GONE') => new AppError(410, code, message);
export const tooMany = (message = 'Too many requests', code = 'RATE_LIMITED') => new AppError(429, code, message);

import { badRequest } from '../utils/errors.js';

/** Validates the request body (or query) against a Zod schema; unknown keys are stripped. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw badRequest(details[0]?.message || 'Invalid request', details);
  }
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};

import { ZodError } from 'zod';
import { fail } from '../utils/response.js';

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(res, 'Validation failed', 422, err.flatten());
      }
      next(err);
    }
  };
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  return fail(res, err.message || 'Internal server error', status);
}

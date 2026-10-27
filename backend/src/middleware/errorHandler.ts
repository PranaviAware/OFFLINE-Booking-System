import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Request payload validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        issue: e.message
      }))
    });
  }

  // Handle custom application errors with status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.name || 'ApplicationError',
      message: err.message,
      details: err.details
    });
  }

  console.error('[Unhandled Internal Error]', err);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected internal server error occurred'
  });
};

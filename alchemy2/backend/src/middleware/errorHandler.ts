/**
 * Error Handler Middleware
 *
 * @module middleware/errorHandler
 * @description Centralized error handling for all routes
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const logger = req.app.locals.logger;

  // Default error values
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error('Error occurred:', {
    error: message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode
  });

  // Send error response
  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

/**
 * Request Logger Middleware
 *
 * @module middleware/requestLogger
 * @description HTTP request logging middleware
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const logger = req.app.locals.logger;
  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
}

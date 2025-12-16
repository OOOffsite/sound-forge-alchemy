/**
 * Validation Middleware
 *
 * @module middleware/validation
 * @description Request validation using Joi
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.body = value;
    next();
  };
}

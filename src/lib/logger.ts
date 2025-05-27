/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * Highly referential and understandable logger utility for Sound Forge Alchemy frontend.
 * Based on backend/config/logging.js, adapted for TypeScript and browser/Node compatibility.
 */

import winston from 'winston';
import { format } from 'winston';

// Create a logger instance with maximum verbosity for all levels
const logger = winston.createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      // Syslog format: <LEVEL> TIMESTAMP MESSAGE [meta]
      return `<${level.toUpperCase()}> ${timestamp} ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      level: 'debug',
      stderrLevels: ['error'],
      consoleWarnLevels: ['warn'],
    }),
  ],
});

export default logger;

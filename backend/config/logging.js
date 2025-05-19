// config/logging.js
const winston = require("winston");
const { format } = require("winston");

const logger = winston.createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
      // Syslog format: <LEVEL> TIMESTAMP MESSAGE [meta]
      return `<${level.toUpperCase()}> ${timestamp} ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      level: "debug",
      stderrLevels: ["error"],
      consoleWarnLevels: ["warn"],
    }),
  ],
});

module.exports = logger;

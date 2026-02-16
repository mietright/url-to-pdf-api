const path = require('path');
const winston = require('winston');

const config = require('../config');

const COLORIZE = config.NODE_ENV === 'development';

function createLogger(filePath) {
  const fileName = path.basename(filePath);

  const logger = winston.createLogger({
    level: config.LOG_LEVEL || 'info',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.label({ label: fileName }),
          winston.format.timestamp(),
          COLORIZE ? winston.format.colorize() : winston.format.simple(),
          winston.format.printf((info) => {
            const {
              timestamp, label, level, message,
            } = info;
            return `${timestamp} [${label}] ${level}: ${message}`;
          }),
        ),
      }),
    ],
  });

  return logger;
}

module.exports = createLogger;

import pino from 'pino';
import { config } from '../config/index';

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'secret',
      'token',
      'credentials',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },
});

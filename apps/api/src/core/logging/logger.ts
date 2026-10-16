import pino from 'pino';
import { env } from '../../config/env';

export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'authorization',
  'token',
  'password',
  'apiKey',
  'secret',
  'rawCsv',
  'csvRow',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.secret',
  '*.authorization',
  '*.rawCsv',
  '*.csvRow',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
});

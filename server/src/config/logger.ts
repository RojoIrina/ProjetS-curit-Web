// ================================================================
// LOGGER — Structured logging with pino-compatible API
// Replaces console.log/error with leveled, timestamped output
// ================================================================
import { env } from './env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, msg: string, data?: Record<string, unknown>): string {
  if (env.NODE_ENV === 'production') {
    // JSON format for production (parseable by log aggregators)
    return JSON.stringify({
      level,
      msg,
      time: new Date().toISOString(),
      ...data,
    });
  }
  // Human-readable for development
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`;
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  return `${prefix} ${msg}${suffix}`;
}

export const logger = {
  debug(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', msg, data));
  },
  info(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('info')) console.info(formatMessage('info', msg, data));
  },
  warn(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', msg, data));
  },
  error(msg: string, data?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatMessage('error', msg, data));
  },
};

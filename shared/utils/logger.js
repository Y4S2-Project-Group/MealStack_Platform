'use strict';

/**
 * Minimal structured console logger wrapper.
 *
 * Usage:
 *   const logger = require('../../shared/utils/logger');
 *   logger.info('Server started', { port: 4001 });
 *   logger.error('Something failed', err);
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const ENV_LEVEL = process.env.LOG_LEVEL
  ? process.env.LOG_LEVEL.toLowerCase()
  : process.env.NODE_ENV === 'production'
  ? 'info'
  : 'debug';

const activeLevel = LEVELS[ENV_LEVEL] !== undefined ? LEVELS[ENV_LEVEL] : LEVELS.debug;

/**
 * Format a log entry as a JSON line.
 * @param {string} level
 * @param {string} message
 * @param {unknown} [meta]
 */
function formatEntry(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (meta !== undefined) {
    entry.meta = meta instanceof Error
      ? { name: meta.name, message: meta.message, stack: meta.stack }
      : meta;
  }
  return JSON.stringify(entry);
}

function log(level, message, meta) {
  if (LEVELS[level] > activeLevel) { return; }
  const line = formatEntry(level, message, meta);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  info:  (message, meta) => log('info',  message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

module.exports = logger;

'use strict';

const mongoose = require('mongoose');
const config   = require('./config/env');
const app      = require('./app');
const logger   = require('../../../shared/utils/logger');

const SERVICE = 'order';

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info(`[${SERVICE}] MongoDB connected`);

    const server = app.listen(config.port, () => {
      logger.info(`[${SERVICE}] Service running`, {
        port:    config.port,
        env:     config.nodeEnv,
        docsUrl: `http://localhost:${config.port}/docs`,
      });
    });

    const shutdown = async (signal) => {
      logger.info(`[${SERVICE}] ${signal} received – shutting down`);
      server.close(async () => {
        await mongoose.connection.close();
        logger.info(`[${SERVICE}] Server and DB connections closed`);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error(`[${SERVICE}] Failed to start`, err);
    process.exit(1);
  }
}

start();

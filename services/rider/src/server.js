'use strict';

const http     = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const config   = require('./config/env');
const app      = require('./app');
const setupSocketHandlers = require('./socket/socketHandler');
const logger   = require('../../../shared/utils/logger');

const SERVICE = 'rider';

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info(`[${SERVICE}] MongoDB connected`);

    // Create HTTP server for Socket.IO
    const server = http.createServer(app);

    // Setup Socket.IO
    const io = new Server(server, {
      cors: {
        origin: config.isProduction
          ? config.frontendUrl
          : ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Initialize socket handlers
    setupSocketHandlers(io);

    // Make io accessible to controllers
    app.set('io', io);

    server.listen(config.port, () => {
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

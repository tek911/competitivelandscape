import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validation';
import { generalLimiter } from './middleware/rateLimit';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(pinoHttp({ logger }));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(sanitizeInput);

app.use(generalLimiter);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

let server: any;

const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API available at: http://localhost:${PORT}/api/v1`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, closing server gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

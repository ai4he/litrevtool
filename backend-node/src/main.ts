import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './core/config';
import logger from './core/logger';
import { testConnection, syncDatabase } from './db';
import authRouter from './api/auth';
import searchJobsRouter from './api/searchJobs';
import fs from 'fs';
import path from 'path';

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: config.BACKEND_CORS_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    app: config.APP_NAME,
    version: config.APP_VERSION,
    status: 'running',
  });
});

// API routes
app.use(`${config.API_V1_STR}/auth`, authRouter);
app.use(`${config.API_V1_STR}/jobs`, searchJobsRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ detail: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Ensure upload directories exist
    const uploadDirs = [
      config.UPLOAD_DIR,
      path.join(config.UPLOAD_DIR, 'screenshots'),
    ];

    for (const dir of uploadDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }

    // Test database connection
    await testConnection();

    // Sync database models
    await syncDatabase();

    // Start server
    app.listen(config.PORT, () => {
      logger.info(`${config.APP_NAME} v${config.APP_VERSION} started`);
      logger.info(`Server running on http://localhost:${config.PORT}`);
      logger.info(`API documentation: http://localhost:${config.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

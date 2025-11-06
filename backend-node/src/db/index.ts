import { Sequelize } from 'sequelize';
import { config } from '../core/config';
import logger from '../core/logger';

// Initialize Sequelize with SQLite
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.DATABASE_PATH,
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Test database connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Sync all models
export async function syncDatabase() {
  try {
    await sequelize.sync();
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error('Error synchronizing database:', error);
    throw error;
  }
}

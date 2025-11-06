import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Application
  APP_NAME: 'LitRevTool',
  APP_VERSION: '1.0.0',
  API_V1_STR: '/api/v1',
  PORT: parseInt(process.env.PORT || '8000', 10),

  // Security
  SECRET_KEY: process.env.SECRET_KEY || 'your-secret-key-change-in-production',
  ALGORITHM: 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: 60 * 24 * 7, // 7 days

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/v1/auth/google/callback',

  // Google Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyDxAW82IQqw4TBb8Od0UvnXafGCYrkwyOU',

  // Database
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(__dirname, '../../litrevtool.db'),

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // Email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@litrevtool.com',

  // File Storage
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB

  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // CORS
  get BACKEND_CORS_ORIGINS() {
    const origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      this.FRONTEND_URL,
    ];
    return [...new Set(origins)];
  },

  // Scraping
  MAX_CONCURRENT_SCRAPERS: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '3', 10),
  SCRAPER_TIMEOUT: parseInt(process.env.SCRAPER_TIMEOUT || '300', 10) * 1000, // 5 minutes in ms
  SCRAPER_RETRY_ATTEMPTS: parseInt(process.env.SCRAPER_RETRY_ATTEMPTS || '5', 10),
  SCRAPER_RETRY_DELAY: parseInt(process.env.SCRAPER_RETRY_DELAY || '10', 10) * 1000, // seconds to ms
};

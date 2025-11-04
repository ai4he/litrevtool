import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  // Application
  app: {
    name: string;
    version: string;
    env: string;
    port: number;
  };

  // Security
  security: {
    secretKey: string;
    accessTokenExpireMinutes: number;
  };

  // Google OAuth
  google: {
    clientId: string;
    clientSecret: string;
  };

  // Google Gemini
  gemini: {
    apiKey: string;
  };

  // Database
  database: {
    url: string;
  };

  // Redis
  redis: {
    url: string;
  };

  // Email
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
  };

  // Frontend
  frontend: {
    url: string;
  };

  // File Storage
  storage: {
    uploadDir: string;
    maxFileSize: number;
  };

  // Scraping
  scraping: {
    maxConcurrentScrapers: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // CORS
  cors: {
    origins: string[];
  };
}

const config: Config = {
  app: {
    name: 'LitRevTool',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '8000', 10),
  },

  security: {
    secretKey: process.env.SECRET_KEY || 'your-secret-key-change-in-production',
    accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '10080', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  database: {
    url: process.env.DATABASE_URL || 'file:./litrevtool.db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379/0',
  },

  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@litrevtool.com',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  },

  scraping: {
    maxConcurrentScrapers: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '3', 10),
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '300000', 10), // 5 minutes
    retryAttempts: parseInt(process.env.SCRAPER_RETRY_ATTEMPTS || '5', 10),
    retryDelay: parseInt(process.env.SCRAPER_RETRY_DELAY || '10000', 10), // 10 seconds
  },

  cors: {
    origins: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:8000',
      'https://litrev.haielab.org',
    ],
  },
};

export default config;

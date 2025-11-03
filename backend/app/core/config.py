from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "LitRevTool"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Google Gemini API
    GEMINI_API_KEY: str = "AIzaSyDxAW82IQqw4TBb8Od0UvnXafGCYrkwyOU"

    # Database
    DATABASE_URL: str = "postgresql://litrevtool:litrevtool@db:5432/litrevtool"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@litrevtool.com"

    # File Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # Scraping
    MAX_CONCURRENT_SCRAPERS: int = 3
    SCRAPER_TIMEOUT: int = 300  # 5 minutes
    SCRAPER_RETRY_ATTEMPTS: int = 5
    SCRAPER_RETRY_DELAY: int = 10  # seconds

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

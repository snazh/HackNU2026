from pathlib import Path

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"


class DBSettings(BaseModel):
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


class AuthSettings(BaseModel):
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    REDIRECT_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


class AdminSettings(BaseModel):
    ADMIN_EMAIL: str
    ADMIN_SUB: str


class RedisSetting(BaseModel):
    REDIS_HOST: str
    REDIS_PORT: int


class CelerySetting(BaseModel):
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str


class MeiliSearchSettings(BaseModel):
    MEILI_URL: str
    MEILI_MASTER_KEY: str


class S3Settings(BaseModel):
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_ACCOUNT_ID: str
    S3_BUCKET: str

    @property
    def s3_endpoint(self) -> str:
        return f"https://{self.S3_ACCOUNT_ID}.r2.cloudflarestorage.com"


class Settings(BaseSettings):
    db: DBSettings
    auth: AuthSettings
    admin_data: AdminSettings
    s3: S3Settings
    redis: RedisSetting
    meilisearch: MeiliSearchSettings
    celery: CelerySetting
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
        env_nested_delimiter="__",
        case_sensitive=False,
    )


settings = Settings()

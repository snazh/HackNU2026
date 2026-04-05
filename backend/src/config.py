from pathlib import Path

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"


class GrokAPI(BaseModel):
    KEY: str


class HiggsfieldAPI(BaseModel):
    KEY: str
    SECRET: str


class Settings(BaseSettings):
    higgsfield: HiggsfieldAPI
    grok: GrokAPI
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
        env_nested_delimiter="__",
        case_sensitive=False,
    )


settings = Settings()

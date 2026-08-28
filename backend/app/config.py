"""Unified settings for the merged RTI Navigator (Track A intake + Track B filing).

Track A code reads UPPER_CASE attributes (settings.DATABASE_URL, settings.OPENAI_API_KEY);
Track B code reads lower_case attributes (settings.database_url, settings.demo_otp).
Both are served here: lower_case fields are canonical, UPPER_CASE are read-only aliases.
"""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_db_url(raw: str) -> str:
    # Track A shipped a psycopg2 URL; the merged stack uses psycopg (v3).
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- shared ---
    database_url: str = "postgresql+psycopg://rti:rti@localhost:5432/rti_navigator"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- Track A (AI intake) ---
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    demo_user_id: int = 1
    debug: bool = False

    # --- Track B (filing lifecycle) ---
    demo_otp: str = "123456"
    payment_amount: int = 10
    demo_mode: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv_origins(cls, v):
        if isinstance(v, str):
            s = v.strip()
            if not s.startswith("["):
                return [part.strip() for part in s.split(",") if part.strip()]
        return v

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        object.__setattr__(self, "database_url", _default_db_url(self.database_url))

    # UPPER_CASE aliases used by Track A modules
    @property
    def DATABASE_URL(self) -> str:
        return self.database_url

    @property
    def OPENAI_API_KEY(self) -> str:
        return self.openai_api_key

    @property
    def LLM_MODEL(self) -> str:
        return self.llm_model

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return self.cors_origins

    @property
    def DEMO_USER_ID(self) -> int:
        return self.demo_user_id

    @property
    def DEBUG(self) -> bool:
        return self.debug


settings = Settings()

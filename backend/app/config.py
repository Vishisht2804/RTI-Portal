"""Unified settings for the merged RTI Navigator (Track A intake + Track B filing).

Track A code reads UPPER_CASE attributes (settings.DATABASE_URL, settings.OPENAI_API_KEY);
Track B code reads lower_case attributes (settings.database_url, settings.demo_otp).
Both are served here: lower_case fields are canonical, UPPER_CASE are read-only aliases.
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_db_url(raw: str) -> str:
    # Track A shipped a psycopg2 URL; the merged stack uses psycopg (v3).
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- shared ---
    database_url: str = Field(
        default="postgresql+psycopg://rti:rti@localhost:5432/rti_navigator",
        validation_alias="DATABASE_URL",
    )

    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        validation_alias="CORS_ORIGINS",
    )

    # --- Track A (AI intake) ---
    openai_api_key: str = Field(
        default="",
        validation_alias="OPENAI_API_KEY",
    )

    llm_model: str = Field(
        default="gpt-4o-mini",
        validation_alias="LLM_MODEL",
    )

    demo_user_id: int = Field(
        default=1,
        validation_alias="DEMO_USER_ID",
    )

    debug: bool = Field(
        default=False,
        validation_alias="DEBUG",
    )

    # --- Track B (filing lifecycle) ---
    demo_otp: str = Field(
        default="123456",
        validation_alias="DEMO_OTP",
    )

    payment_amount: int = Field(
        default=10,
        validation_alias="PAYMENT_AMOUNT",
    )

    demo_mode: bool = Field(
        default=True,
        validation_alias="DEMO_MODE",
    )

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
        object.__setattr__(
            self,
            "database_url",
            _default_db_url(self.database_url),
        )

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

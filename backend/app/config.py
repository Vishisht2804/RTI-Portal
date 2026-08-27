from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://rti:rti@localhost:5432/rti_navigator",
    )
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    demo_otp: str = os.getenv("DEMO_OTP", "123456")
    payment_amount: int = int(os.getenv("RTI_PAYMENT_AMOUNT", "10"))
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"


settings = Settings()


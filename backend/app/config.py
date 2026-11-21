from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "ProServices"
    DEBUG: bool = False
    # Paiements simulés (aucune passerelle réelle branchée) : pratique pour une démonstration.
    # Sans effet sur la sécurité tant qu'aucun retrait d'argent réel n'existe. Mettre à false en vraie production.
    PAYMENT_SIMULATION: bool = False

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "proservices"
    REDIS_URL: str = "redis://localhost:6379"

    SECRET_KEY: str = "changeme-secret-key-in-production-at-least-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@proservices.fr"
    FRONTEND_URL: str = "http://localhost:5173"
    PUBLIC_API_URL: str = "http://localhost:8000"

    MTN_MOMO_API_KEY: str = ""
    MTN_MOMO_SUBSCRIPTION_KEY: str = ""
    MTN_MOMO_ENVIRONMENT: str = "sandbox"

    ORANGE_MONEY_CLIENT_ID: str = ""
    ORANGE_MONEY_CLIENT_SECRET: str = ""

    CURRENCY: str = "EUR"
    DEFAULT_COUNTRY: str = "FR"

    # Paliers de commission (en EUR)
    COMMISSION_THRESHOLD_SMALL: float = 100
    COMMISSION_THRESHOLD_LARGE: float = 1000
    COMMISSION_RATE_SMALL: float = 0.15
    COMMISSION_RATE_MEDIUM: float = 0.10
    COMMISSION_RATE_LARGE: float = 0.08
    COMMISSION_PREMIUM_DISCOUNT: float = 0.03

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env"}


settings = Settings()

_DEFAULT_SECRET = "changeme-secret-key-in-production-at-least-32-chars"
if not settings.DEBUG and (settings.SECRET_KEY == _DEFAULT_SECRET or len(settings.SECRET_KEY) < 32):
    raise RuntimeError("SECRET_KEY doit être défini (32 caractères minimum) dans .env avant la mise en production.")

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def payments_simulated() -> bool:
    return settings.DEBUG or settings.PAYMENT_SIMULATION

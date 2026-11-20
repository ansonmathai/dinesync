from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "A M Foods"
    DEBUG: bool = False

    # Database Settings
    DATABASE_URL: str

    # Redis & Cache Settings
    REDIS_URL: str = "redis://redis:6379/0"
    MENU_CACHE_TTL: int = 300
    ACTIVE_ORDERS_CACHE_TTL: int = 30
    ORDER_LOOKUP_CACHE_TTL: int = 120

    # Security
    SECRET_KEY: str = Field(..., min_length=12)

    # Tell Pydantic to read from the .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Create a singleton instance to be reused across the app
settings = Settings()
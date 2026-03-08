"""Application configuration for environment variables and constants."""

from pydantic import BaseModel


class AppConfig(BaseModel):
    """Typed runtime configuration for the API service."""

    app_name: str = "FinMind AI Pro"
    database_url: str = "sqlite:///./finmind.db"


config = AppConfig()

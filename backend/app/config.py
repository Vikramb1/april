from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "sqlite:///./april.db"
    chrome_cdp_url: str = "http://localhost:9222"
    browser_use_api_key: str = ""
    gusto_profile_id: Optional[str] = None
    gusto_email: str = ""
    gusto_password: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

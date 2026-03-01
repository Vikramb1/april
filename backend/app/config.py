import os
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path so uvicorn can be launched from any directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_URL = f"sqlite:///{_BACKEND_DIR}/april.db"


class Settings(BaseSettings):
    openai_api_key: str
    database_url: str = _DEFAULT_DB_URL
    chrome_cdp_url: str = "http://localhost:9222"
    browser_use_api_key: str = ""
    gusto_profile_id: Optional[str] = None
    gusto_email: str = ""
    gusto_password: str = ""
    fidelity_email: str = ""
    fidelity_password: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

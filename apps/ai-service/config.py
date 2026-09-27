"""Environment-backed configuration for the AI service."""

from dataclasses import dataclass, field
import os


def required_environment_variable(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def positive_integer_environment_variable(name: str, default: int) -> int:
    raw_value = os.environ.get(name, str(default)).strip()
    try:
        value = int(raw_value)
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer.") from error
    if value < 1:
        raise RuntimeError(f"{name} must be a positive integer.")
    return value


@dataclass(frozen=True)
class Settings:
    database_url: str = field(repr=False)
    openai_api_key: str = field(repr=False)
    generation_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(
            database_url=required_environment_variable("DATABASE_URL"),
            openai_api_key=required_environment_variable("OPENAI_API_KEY"),
            generation_model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini").strip()
            or "gpt-4.1-mini",
            embedding_model=os.environ.get(
                "OPENAI_EMBEDDING_MODEL",
                "text-embedding-3-small",
            ).strip()
            or "text-embedding-3-small",
            embedding_dimensions=positive_integer_environment_variable(
                "OPENAI_EMBEDDING_DIMENSIONS",
                1536,
            ),
        )

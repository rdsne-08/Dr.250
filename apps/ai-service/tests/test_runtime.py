import pytest
from fastapi.testclient import TestClient

from config import Settings
from dependencies import get_ai, get_database, get_rag, get_settings
from main import create_app


@pytest.fixture(autouse=True)
def configured_environment(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/dr250_test")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-generation-model")
    monkeypatch.setenv("OPENAI_EMBEDDING_MODEL", "test-embedding-model")
    monkeypatch.setenv("OPENAI_EMBEDDING_DIMENSIONS", "256")
    get_settings.cache_clear()
    get_database.cache_clear()
    get_ai.cache_clear()
    get_rag.cache_clear()
    yield
    get_settings.cache_clear()
    get_database.cache_clear()
    get_ai.cache_clear()
    get_rag.cache_clear()


def test_health_endpoint_is_available_without_exposing_secrets():
    with TestClient(create_app()) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "Dr.250 AI service",
        "status": "ok",
    }
    assert "test-openai-key" not in response.text


def test_existing_ai_routers_are_connected():
    paths = create_app().openapi()["paths"]

    assert "/history/query" in paths
    assert "/summary/pre-visit" in paths
    assert "/symptom/assist" in paths


def test_settings_load_models_and_secrets_from_environment():
    settings = Settings.from_environment()

    assert settings.database_url.endswith("/dr250_test")
    assert settings.openai_api_key == "test-openai-key"
    assert settings.generation_model == "test-generation-model"
    assert settings.embedding_model == "test-embedding-model"
    assert settings.embedding_dimensions == 256
    assert "test-openai-key" not in repr(settings)
    assert "postgresql://" not in repr(settings)


def test_startup_requires_the_openai_api_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("OPENAI_API_KEY")
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        with TestClient(create_app()):
            pass

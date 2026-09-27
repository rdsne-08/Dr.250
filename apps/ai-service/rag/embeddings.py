"""OpenAI embedding and text generation adapters."""

from pathlib import Path

from openai import OpenAI

from config import Settings


PROMPT_DIRECTORY = Path(__file__).resolve().parent.parent / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPT_DIRECTORY / name).read_text(encoding="utf-8").strip()


class OpenAIAdapter:
    def __init__(self, settings: Settings, client: OpenAI | None = None) -> None:
        self._settings = settings
        self._client = client or OpenAI(api_key=settings.openai_api_key)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self._client.embeddings.create(
            model=self._settings.embedding_model,
            input=texts,
            encoding_format="float",
            dimensions=self._settings.embedding_dimensions,
        )
        return [item.embedding for item in sorted(response.data, key=lambda item: item.index)]

    def generate(self, *, instructions: str, prompt: str) -> str:
        response = self._client.responses.create(
            model=self._settings.generation_model,
            instructions=instructions,
            input=prompt,
            store=False,
        )
        return response.output_text.strip()

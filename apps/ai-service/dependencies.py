"""Shared dependency factories for the AI API routes."""

from functools import lru_cache

from config import Settings
from database.db import Database
from rag.embeddings import OpenAIAdapter
from rag.retrieval import MedicalHistoryRAG


@lru_cache
def get_settings() -> Settings:
    return Settings.from_environment()


@lru_cache
def get_database() -> Database:
    return Database(get_settings().database_url)


@lru_cache
def get_ai() -> OpenAIAdapter:
    return OpenAIAdapter(get_settings())


@lru_cache
def get_rag() -> MedicalHistoryRAG:
    return MedicalHistoryRAG(get_database(), get_ai())

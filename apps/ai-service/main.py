"""FastAPI application entry point for the Dr.250 AI service."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.history import router as history_router
from api.summary import router as summary_router
from api.symptom import router as symptom_router
from dependencies import get_settings


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.settings = get_settings()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Dr.250 AI Service",
        version="0.1.0",
        lifespan=lifespan,
    )

    @application.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {
            "service": "Dr.250 AI service",
            "status": "ok",
        }

    application.include_router(history_router, prefix="/history", tags=["history"])
    application.include_router(summary_router, prefix="/summary", tags=["summary"])
    application.include_router(symptom_router, prefix="/symptom", tags=["symptoms"])
    return application


app = create_app()

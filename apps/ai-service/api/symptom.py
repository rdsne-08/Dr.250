from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAIError
from pydantic import BaseModel, Field

from dependencies import get_ai
from rag.embeddings import OpenAIAdapter, load_prompt
from security.verify_access import Actor, Role, actor_from_headers


router = APIRouter()

RED_FLAG_TERMS = (
    "chest pain",
    "cannot breathe",
    "can't breathe",
    "severe bleeding",
    "unconscious",
    "suicidal",
    "stroke",
    "seizure",
)


class SymptomRequest(BaseModel):
    symptoms: str = Field(min_length=3, max_length=2000)
    context: str | None = Field(default=None, max_length=1000)


@router.post("/assist")
def symptom_helper(
    request: SymptomRequest,
    actor: Annotated[Actor, Depends(actor_from_headers)],
    ai: Annotated[OpenAIAdapter, Depends(get_ai)],
) -> dict:
    if actor.role not in {Role.PATIENT, Role.DOCTOR}:
        raise HTTPException(status_code=403, detail="This helper is for patients and doctors.")

    urgent = any(term in request.symptoms.lower() for term in RED_FLAG_TERMS)
    emergency_notice = (
        "The description may include an emergency warning sign. Seek immediate local emergency "
        "care now. Do not wait for an online response."
        if urgent
        else ""
    )
    try:
        guidance = ai.generate(
            instructions=load_prompt("symptom_prompt.txt"),
            prompt=(
                f"Emergency notice to preserve: {emergency_notice or 'None detected by screening.'}\n"
                f"Symptoms: {request.symptoms}\n"
                f"Additional context: {request.context or 'None provided.'}"
            ),
        )
        return {
            "guidance": guidance,
            "urgent": urgent,
            "disclaimer": "General information only; this does not diagnose or replace medical care.",
        }
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider is temporarily unavailable.",
        ) from error

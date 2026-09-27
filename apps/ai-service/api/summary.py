import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAIError
from pydantic import BaseModel
import psycopg

from database.db import Database
from dependencies import get_ai, get_database
from rag.embeddings import OpenAIAdapter
from security.verify_access import Actor, actor_from_headers, verify_doctor_access


router = APIRouter()


class SummaryRequest(BaseModel):
    patient_id: UUID


@router.post("/pre-visit")
def pre_visit_summary(
    request: SummaryRequest,
    actor: Annotated[Actor, Depends(actor_from_headers)],
    database: Annotated[Database, Depends(get_database)],
    ai: Annotated[OpenAIAdapter, Depends(get_ai)],
) -> dict[str, str]:
    try:
        verify_doctor_access(database, actor, request.patient_id)
        history = database.previsit_data(request.patient_id)
        if history["patient"] is None:
            raise HTTPException(status_code=404, detail="Patient was not found.")
        summary = ai.generate(
            instructions=(
                "Create a concise doctor pre-visit brief using only the supplied data. Use the "
                "headings: Key history, Current/recent medications, Allergies, Recent lab results, "
                "and Items to clarify. Never infer an allergy, diagnosis, or medication status. "
                "State 'Not documented' when the data does not contain it. This is decision support, "
                "not a diagnosis."
            ),
            prompt=json.dumps(history, default=str, ensure_ascii=False),
        )
        return {"summary": summary}
    except HTTPException:
        raise
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider is temporarily unavailable.",
        ) from error
    except psycopg.Error as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Patient summary data is temporarily unavailable.",
        ) from error

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAIError
from pydantic import BaseModel, Field
import psycopg

from database.db import Database
from dependencies import get_database, get_rag
from rag.retrieval import MedicalHistoryRAG
from security.verify_access import Actor, actor_from_headers, verify_patient_access


router = APIRouter()


class HistoryRequest(BaseModel):
    patient_id: UUID
    question: str = Field(min_length=3, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=10)


@router.post("/query")
def query_history(
    request: HistoryRequest,
    actor: Annotated[Actor, Depends(actor_from_headers)],
    database: Annotated[Database, Depends(get_database)],
    rag: Annotated[MedicalHistoryRAG, Depends(get_rag)],
) -> dict:
    try:
        verify_patient_access(database, actor, request.patient_id)
        return rag.answer(
            patient_id=request.patient_id,
            question=request.question,
            limit=request.top_k,
        )
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider is temporarily unavailable.",
        ) from error
    except psycopg.Error as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Medical history retrieval is temporarily unavailable.",
        ) from error

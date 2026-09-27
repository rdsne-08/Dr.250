"""Defense-in-depth authorization for requests forwarded by the backend."""

from dataclasses import dataclass
from enum import Enum
from uuid import UUID

from fastapi import Header, HTTPException, status

from database.db import Database


class Role(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


@dataclass(frozen=True)
class Actor:
    user_id: UUID
    role: Role


def actor_from_headers(
    x_actor_id: UUID = Header(alias="X-Actor-Id"),
    x_actor_role: Role = Header(alias="X-Actor-Role"),
) -> Actor:
    return Actor(user_id=x_actor_id, role=x_actor_role)


def verify_patient_access(database: Database, actor: Actor, patient_id: UUID) -> None:
    if actor.role is Role.ADMIN:
        return
    if actor.role is Role.PATIENT and database.patient_belongs_to_user(actor.user_id, patient_id):
        return
    if actor.role is Role.DOCTOR and database.doctor_has_patient_access(actor.user_id, patient_id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Patient access is not authorized.",
    )


def verify_doctor_access(database: Database, actor: Actor, patient_id: UUID) -> None:
    if actor.role is not Role.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A verified doctor with active patient access is required.",
        )
    verify_patient_access(database, actor, patient_id)

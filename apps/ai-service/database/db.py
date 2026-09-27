"""Parameterized PostgreSQL access for authorization, RAG, and summaries."""

from contextlib import contextmanager
from datetime import datetime
import math
from typing import Iterator
from uuid import UUID

import psycopg
from psycopg.rows import dict_row


PATIENT_VECTOR_SEARCH_SQL = """
    SELECT embedding.id,
           embedding.medical_record_id,
           embedding.chunk_index,
           embedding.content,
           record.title,
           record.record_type,
           record.created_at,
           1 - (embedding.embedding <=> %s::vector) AS similarity
    FROM public.medical_embeddings AS embedding
    INNER JOIN public.medical_records AS record
      ON record.id = embedding.medical_record_id
     AND record.patient_id = %s
    WHERE embedding.patient_id = %s
    ORDER BY embedding.embedding <=> %s::vector
    LIMIT %s
"""


def vector_literal(values: list[float]) -> str:
    if not values or any(not math.isfinite(value) for value in values):
        raise ValueError("Embedding must contain finite values.")
    return "[" + ",".join(str(float(value)) for value in values) + "]"


class Database:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    @contextmanager
    def connection(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as connection:
            yield connection

    def fetch_one(self, statement: str, parameters: tuple = ()) -> dict | None:
        with self.connection() as connection, connection.cursor() as cursor:
            cursor.execute(statement, parameters)
            return cursor.fetchone()

    def fetch_all(self, statement: str, parameters: tuple = ()) -> list[dict]:
        with self.connection() as connection, connection.cursor() as cursor:
            cursor.execute(statement, parameters)
            return list(cursor.fetchall())

    def patient_belongs_to_user(self, user_id: UUID, patient_id: UUID) -> bool:
        row = self.fetch_one(
            """
            SELECT patient.id
            FROM public.patients AS patient
            INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
            WHERE profile.user_id = %s AND patient.id = %s
            LIMIT 1
            """,
            (user_id, patient_id),
        )
        return row is not None

    def doctor_has_patient_access(self, user_id: UUID, patient_id: UUID) -> bool:
        row = self.fetch_one(
            """
            SELECT 1
            FROM public.doctors AS doctor
            INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
            INNER JOIN public.access_sessions AS session
              ON session.doctor_id = doctor.id
             AND session.patient_id = %s
             AND session.revoked_at IS NULL
             AND session.expires_at > now()
            WHERE profile.user_id = %s
              AND doctor.verification_status = 'VERIFIED'
            LIMIT 1
            """,
            (patient_id, user_id),
        )
        return row is not None

    def records_needing_embeddings(self, patient_id: UUID) -> list[dict]:
        return self.fetch_all(
            """
            SELECT record.id, record.patient_id, record.title, record.description,
                   record.record_type, record.created_at, record.updated_at
            FROM public.medical_records AS record
            LEFT JOIN (
                SELECT medical_record_id, max(source_updated_at) AS indexed_at
                FROM public.medical_embeddings
                WHERE patient_id = %s
                GROUP BY medical_record_id
            ) AS indexed ON indexed.medical_record_id = record.id
            WHERE record.patient_id = %s
              AND (indexed.indexed_at IS NULL OR indexed.indexed_at < record.updated_at)
            ORDER BY record.created_at DESC
            """,
            (patient_id, patient_id),
        )

    def replace_record_embeddings(
        self,
        *,
        record_id: UUID,
        patient_id: UUID,
        chunks: list[str],
        embeddings: list[list[float]],
        source_updated_at: datetime,
    ) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Every chunk must have one embedding.")
        with self.connection() as connection, connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO public.medical_embeddings
                    (medical_record_id, patient_id, chunk_index, content,
                     embedding, source_updated_at)
                VALUES (%s, %s, %s, %s, %s::vector, %s)
                ON CONFLICT (medical_record_id, chunk_index) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    source_updated_at = EXCLUDED.source_updated_at
                """,
                [
                    (
                        record_id,
                        patient_id,
                        index,
                        chunk,
                        vector_literal(embedding),
                        source_updated_at,
                    )
                    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True))
                ],
            )
            cursor.execute(
                """
                DELETE FROM public.medical_embeddings
                WHERE medical_record_id = %s
                  AND patient_id = %s
                  AND chunk_index >= %s
                """,
                (record_id, patient_id, len(chunks)),
            )

    def search_patient_chunks(
        self,
        patient_id: UUID,
        embedding: list[float],
        limit: int,
    ) -> list[dict]:
        vector = vector_literal(embedding)
        return self.fetch_all(
            PATIENT_VECTOR_SEARCH_SQL,
            (vector, patient_id, patient_id, vector, limit),
        )

    def previsit_data(self, patient_id: UUID) -> dict:
        patient = self.fetch_one(
            """
            SELECT patient.id, profile.full_name, patient.date_of_birth,
                   patient.gender, patient.blood_group
            FROM public.patients AS patient
            INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
            WHERE patient.id = %s
            """,
            (patient_id,),
        )
        records = self.fetch_all(
            """
            SELECT title, description, record_type, created_at
            FROM public.medical_records
            WHERE patient_id = %s
            ORDER BY created_at DESC
            LIMIT 30
            """,
            (patient_id,),
        )
        prescriptions = self.fetch_all(
            """
            SELECT medicine, dosage, duration, instructions, created_at
            FROM public.prescriptions
            WHERE patient_id = %s
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (patient_id,),
        )
        reports = self.fetch_all(
            """
            SELECT test_name, status, created_at, updated_at
            FROM public.lab_reports
            WHERE patient_id = %s
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (patient_id,),
        )
        return {
            "patient": patient,
            "records": records,
            "prescriptions": prescriptions,
            "lab_reports": reports,
        }

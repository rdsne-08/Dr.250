"""Medical-history indexing and patient-scoped semantic retrieval."""

from uuid import UUID

from database.db import Database
from rag.chunking import chunk_text, record_text
from rag.embeddings import OpenAIAdapter, load_prompt


class MedicalHistoryRAG:
    def __init__(self, database: Database, ai: OpenAIAdapter) -> None:
        self._database = database
        self._ai = ai

    def refresh_patient_index(self, patient_id: UUID) -> int:
        indexed_chunks = 0
        for record in self._database.records_needing_embeddings(patient_id):
            chunks = chunk_text(record_text(record))
            embeddings = self._ai.embed(chunks)
            self._database.replace_record_embeddings(
                record_id=record["id"],
                patient_id=patient_id,
                chunks=chunks,
                embeddings=embeddings,
                source_updated_at=record["updated_at"],
            )
            indexed_chunks += len(chunks)
        return indexed_chunks

    def retrieve(self, *, patient_id: UUID, question: str, limit: int = 6) -> list[dict]:
        self.refresh_patient_index(patient_id)
        query_embedding = self._ai.embed([question])[0]
        return self._database.search_patient_chunks(patient_id, query_embedding, limit)

    def answer(self, *, patient_id: UUID, question: str, limit: int = 6) -> dict:
        matches = self.retrieve(patient_id=patient_id, question=question, limit=limit)
        if not matches:
            return {
                "answer": "I could not find relevant information in the stored medical history.",
                "sources": [],
            }

        context = "\n\n".join(
            f"[Record {index}] {item['record_type']} | {item['created_at']} | "
            f"{item['title']}\n{item['content']}"
            for index, item in enumerate(matches, start=1)
        )
        prompt = (
            f"Patient question:\n{question}\n\n"
            f"Authorized patient-record context:\n{context}"
        )
        answer = self._ai.generate(
            instructions=load_prompt("history_prompt.txt"),
            prompt=prompt,
        )
        return {
            "answer": answer,
            "sources": [
                {
                    "record_id": str(item["medical_record_id"]),
                    "title": item["title"],
                    "record_type": item["record_type"],
                    "date": item["created_at"],
                }
                for item in matches
            ],
        }

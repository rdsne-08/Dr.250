"""Small deterministic text chunker used before embedding records."""


def chunk_text(text: str, *, max_chars: int = 1800, overlap_chars: int = 200) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []
    if max_chars < 200:
        raise ValueError("max_chars must be at least 200")
    if overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("overlap_chars must be smaller than max_chars")

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + max_chars, len(normalized))
        if end < len(normalized):
            boundary = normalized.rfind(" ", start + max_chars // 2, end)
            if boundary > start:
                end = boundary
        chunks.append(normalized[start:end].strip())
        if end == len(normalized):
            break
        start = end - overlap_chars
    return chunks


def record_text(record: dict) -> str:
    return "\n".join(
        part
        for part in (
            f"Record type: {record['record_type']}",
            f"Date: {record['created_at']}",
            f"Title: {record['title']}",
            f"Details: {record.get('description')}" if record.get("description") else None,
        )
        if part
    )

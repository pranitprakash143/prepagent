import logging
from pathlib import Path
from typing import Annotated, Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.services.document_service import chunk_text
from app.services.text_cleaner import clean_text

logger = logging.getLogger(__name__)


def _overwrite(a: Any, b: Any) -> Any:
    return b


class IngestionState(TypedDict):
    document_id: Annotated[str, _overwrite]
    user_id: Annotated[str, _overwrite]
    tenant_id: Annotated[str, _overwrite]
    file_path: Annotated[str, _overwrite]
    raw_text: Annotated[str, _overwrite]
    cleaned_text: Annotated[str, _overwrite]
    chunks: Annotated[List[str], _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


def extract_node(state: IngestionState) -> Dict[str, Any]:
    try:
        path = Path(state["file_path"])
        if not path.exists():
            return {
                "status": "failed",
                "error": f"File not found: {state['file_path']}",
            }
        from app.services.document_service import extract_text

        text = extract_text(path)
        return {"raw_text": text, "status": "extracted"}
    except Exception as e:
        logger.exception("Extraction failed: %s", e)
        return {"status": "failed", "error": str(e)}


def clean_node(state: IngestionState) -> Dict[str, Any]:
    try:
        cleaned = clean_text(state["raw_text"])
        return {"cleaned_text": cleaned, "status": "cleaned"}
    except Exception as e:
        logger.exception("Cleaning failed: %s", e)
        return {"status": "failed", "error": str(e)}


def chunk_node(state: IngestionState) -> Dict[str, Any]:
    try:
        chunks = chunk_text(
            state["cleaned_text"],
            settings.CHUNK_SIZE,
            settings.CHUNK_OVERLAP,
        )
        return {"chunks": chunks, "status": "chunked"}
    except Exception as e:
        logger.exception("Chunking failed: %s", e)
        return {"status": "failed", "error": str(e)}


def embed_node(state: IngestionState) -> Dict[str, Any]:
    try:
        import asyncio
        import uuid
        from app.services.chroma_service import add_documents_to_chroma

        metadatas = [
            {
                "document_id": state["document_id"],
                "user_id": state["user_id"],
                "tenant_id": state["tenant_id"],
                "chunk_index": i,
            }
            for i in range(len(state["chunks"]))
        ]
        ids = [str(uuid.uuid4()) for _ in state["chunks"]]
        asyncio.run(add_documents_to_chroma(state["chunks"], metadatas, ids))
        return {"status": "done"}
    except Exception as e:
        logger.exception("Embedding failed: %s", e)
        return {"status": "failed", "error": str(e)}


def build_ingestion_agent():
    workflow = StateGraph(IngestionState)
    workflow.add_node("extract", extract_node)
    workflow.add_node("clean", clean_node)
    workflow.add_node("chunk", chunk_node)
    workflow.add_node("embed", embed_node)
    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "clean")
    workflow.add_edge("clean", "chunk")
    workflow.add_edge("chunk", "embed")
    workflow.add_edge("embed", END)
    return workflow.compile()

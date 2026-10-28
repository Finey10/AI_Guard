"""
retrieval.py — Optional RAG module using ChromaDB for policy and checklist retrieval.

Gracefully handles:
- Missing ChromaDB or embedding models
- Empty document directories
- Retrieval failures without interrupting core release analysis
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("releaseguard.retrieval")

_POLICIES_DIR = Path(os.environ.get("POLICIES_DIR", Path(__file__).parent.parent / "data" / "policies"))
_CHROMA_CLIENT = None
_COLLECTION = None
_RETRIEVAL_INITIALIZED = False


def _init_chroma() -> Optional[Any]:
    """Initialize ChromaDB in-memory collection and index policy documents."""
    global _CHROMA_CLIENT, _COLLECTION, _RETRIEVAL_INITIALIZED
    if _RETRIEVAL_INITIALIZED:
        return _COLLECTION

    _RETRIEVAL_INITIALIZED = True

    try:
        import chromadb
        from chromadb.config import Settings

        client = chromadb.Client(Settings(anonymized_telemetry=False, is_persistent=False))
        collection = client.get_or_create_collection(name="releaseguard_policies")

        # Load policy documents if directory exists
        if _POLICIES_DIR.exists():
            docs = []
            metadatas = []
            ids = []
            doc_idx = 0

            for md_file in _POLICIES_DIR.glob("*.md"):
                try:
                    content = md_file.read_text(encoding="utf-8")
                    # Split by top-level or second-level headings
                    sections = [s.strip() for s in content.split("##") if s.strip()]
                    for sec_idx, section in enumerate(sections):
                        chunk_id = f"{md_file.stem}_{sec_idx}"
                        docs.append(f"## {section}" if not section.startswith("#") else section)
                        metadatas.append({
                            "source": md_file.name,
                            "section": sec_idx,
                            "type": "organizational_policy",
                        })
                        ids.append(chunk_id)
                        doc_idx += 1
                except Exception as file_exc:
                    logger.warning("Could not read policy file %s: %s", md_file, file_exc)

            if docs:
                collection.upsert(documents=docs, metadatas=metadatas, ids=ids)
                logger.info("ChromaDB indexed %d policy chunks from %s", len(docs), _POLICIES_DIR)

        _CHROMA_CLIENT = client
        _COLLECTION = collection
        return _COLLECTION
    except Exception as exc:
        logger.info("ChromaDB retrieval is unavailable or disabled: %s", exc)
        _COLLECTION = None
        return None


def retrieve_relevant_policies(query: str, top_k: int = 2) -> list[dict[str, Any]]:
    """
    Retrieve relevant policy passages for a given query (e.g. 'error budget exhausted' or 'canary rollout').

    Returns a list of dicts:
        [{"source": "slo_error_budget_policy.md", "content": "..."}]

    Returns empty list if ChromaDB is unavailable, empty, or retrieval fails.
    """
    try:
        collection = _init_chroma()
        if collection is None or collection.count() == 0:
            return []

        results = collection.query(query_texts=[query], n_results=top_k)
        retrieved: list[dict[str, Any]] = []

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        for doc, meta in zip(documents, metadatas):
            retrieved.append({
                "source": meta.get("source", "unknown_policy.md"),
                "content": doc,
            })

        return retrieved
    except Exception as exc:
        logger.warning("Policy retrieval query failed: %s", exc)
        return []


def is_retrieval_active() -> bool:
    """Check if ChromaDB policy retrieval is functional and populated."""
    try:
        col = _init_chroma()
        return col is not None and col.count() > 0
    except Exception:
        return False

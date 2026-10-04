"""
ORION-AI — Knowledge Base & Qdrant Vector Search REST API.
Exposes Qdrant collection documents, semantic vector search, and ingestion to web clients.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from tools.qdrant_tools import QdrantTool

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base (Qdrant)"])

_qdrant_tool = QdrantTool()


# ─────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────

class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Semantic search query")
    source: Optional[str] = Field(None, description="Optional silo filter: confluence, sharepoint, github")
    domain: Optional[str] = Field(None, description="Optional domain filter")
    limit: int = Field(default=5, ge=1, le=50, description="Max results to return")


class KnowledgeDocument(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    source: str
    domain: Optional[str] = "General"
    filename: Optional[str] = ""
    freshness: float = 0.95
    authority: float = 0.90
    reliability: float = 0.88
    score: Optional[float] = None


class KnowledgeListResponse(BaseModel):
    total: int
    documents: List[KnowledgeDocument]


class KnowledgeStatsResponse(BaseModel):
    collection: str
    status: str
    points_count: int
    vector_size: int
    host: str


class KnowledgeIngestResponse(BaseModel):
    status: str
    indexed_count: int
    collection: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("", response_model=KnowledgeListResponse, summary="List Knowledge Documents in Qdrant")
async def list_knowledge(
    limit: int = 50,
    source: Optional[str] = None
) -> KnowledgeListResponse:
    """
    Returns indexed documents stored in the Qdrant vector database collection.
    """
    try:
        docs = _qdrant_tool.list_documents(limit=limit, source=source)
        return KnowledgeListResponse(
            total=len(docs),
            documents=[KnowledgeDocument(**d) for d in docs]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents from Qdrant: {str(e)}"
        )


@router.post("/search", response_model=List[KnowledgeDocument], summary="Semantic Vector Search in Qdrant")
async def search_knowledge(req: KnowledgeSearchRequest) -> List[KnowledgeDocument]:
    """
    Executes semantic vector search in Qdrant using the all-MiniLM-L6-v2 embedding model.
    Returns matching documents ranked by cosine similarity score.
    """
    try:
        results = _qdrant_tool.search(
            query=req.query,
            source=req.source,
            domain=req.domain,
            limit=req.limit
        )
        return [KnowledgeDocument(**r) for r in results]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Qdrant vector search failed: {str(e)}"
        )


@router.get("/stats", response_model=KnowledgeStatsResponse, summary="Qdrant Collection Statistics")
async def knowledge_stats() -> KnowledgeStatsResponse:
    """
    Returns real-time status and vector point count from Qdrant.
    """
    stats = _qdrant_tool.get_collection_stats()
    return KnowledgeStatsResponse(**stats)


@router.post("/ingest", response_model=KnowledgeIngestResponse, summary="Ingest Local Markdown Knowledge Base into Qdrant")
async def ingest_knowledge() -> KnowledgeIngestResponse:
    """
    Scans the knowledge-base directory, computes vector embeddings, and upserts points into Qdrant.
    """
    try:
        res = _qdrant_tool.ingest_knowledge_base()
        return KnowledgeIngestResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}"
        )

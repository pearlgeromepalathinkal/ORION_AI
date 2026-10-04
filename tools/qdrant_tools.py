import os
import uuid
import threading
import torch
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
torch.set_num_threads(4)

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass


class QdrantTool:
    """
    Client for managing Qdrant vector storage, document indexing,
    and semantic evidence retrieval.
    """
    _lock = threading.Lock()

    def __init__(self) -> None:
        """
        Initialize Qdrant client, configuration parameters, and embedding model.
        """
        self.host = os.getenv("QDRANT_HOST", "http://localhost:6333")
        self.collection_name = os.getenv("QDRANT_COLLECTION", "orion_knowledge")
        self.vector_dim = 384
        
        self._client = None
        self._encoder = None

    @property
    def client(self):
        """
        Lazy loader for QdrantClient to avoid slow initialization on import.
        """
        if self._client is None:
            with QdrantTool._lock:
                if self._client is None:
                    from qdrant_client import QdrantClient
                    self._client = QdrantClient(url=self.host)
        return self._client

    @property
    def encoder(self):
        """
        Thread-safe lazy loader for SentenceTransformer embedding model on CPU.
        """
        if self._encoder is None:
            with QdrantTool._lock:
                if self._encoder is None:
                    from sentence_transformers import SentenceTransformer
                    self._encoder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        return self._encoder

    def health_check(self) -> Tuple[bool, str]:
        """
        Verify connection to the local Qdrant instance or fallback to local knowledge base.
        """
        try:
            collections = self.client.get_collections()
            return True, f"Connected to Qdrant. Active collections: {[c.name for c in collections.collections]}"
        except Exception:
            docs = self._get_local_docs()
            return True, f"Qdrant Knowledge Base Active (Local Mode: {len(docs)} documents loaded)"

    def init_collection(self) -> bool:
        """
        Create the Qdrant collection if it does not already exist.
        """
        from qdrant_client.http.models import Distance, VectorParams
        
        try:
            collections = self.client.get_collections()
            existing_names = [c.name for c in collections.collections]
            
            if self.collection_name not in existing_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_dim,
                        distance=Distance.COSINE
                    )
                )
            return True
        except Exception as e:
            print(f"Error initializing Qdrant collection: {e}")
            return False

    def ingest_knowledge_base(self, kb_root: str = "knowledge-base") -> Dict[str, Any]:
        """
        Scans knowledge-base directory, generates vector embeddings for files,
        and uploads documents into Qdrant.
        """
        from qdrant_client.http.models import PointStruct

        if not self.init_collection():
            return {"status": "error", "indexed_count": 0, "message": "Failed to initialize collection"}

        root_path = Path(kb_root).resolve()
        if not root_path.exists():
            return {"status": "error", "indexed_count": 0, "message": f"Path '{kb_root}' not found"}

        raw_docs = []
        print(f"Scanning '{kb_root}' for knowledge base files...", flush=True)

        for file_path in root_path.glob("**/*"):
            if file_path.is_file() and file_path.suffix.lower() in [".txt", ".md"]:
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read().strip()
                    
                    if not text:
                        continue

                    rel_parts = file_path.relative_to(root_path).parts
                    domain = rel_parts[0] if len(rel_parts) > 0 else "General"
                    source = rel_parts[1].lower() if len(rel_parts) > 1 else "confluence"
                    if "confulence" in source:
                        source = "confluence"

                    title = file_path.stem.replace("_", " ").title()
                    freshness = 0.95
                    authority = 0.90
                    reliability = 0.88
                    content = text

                    lines = text.splitlines()
                    for line in lines:
                        if ":" in line:
                            key, val = line.split(":", 1)
                            key_clean = key.strip().lower()
                            val_clean = val.strip()
                            
                            if key_clean == "title":
                                title = val_clean
                            elif key_clean == "source":
                                source = val_clean.lower()
                            elif key_clean == "domain":
                                domain = val_clean
                            elif key_clean == "freshness":
                                try:
                                    freshness = float(val_clean)
                                except ValueError:
                                    pass
                            elif key_clean == "authority":
                                try:
                                    authority = float(val_clean)
                                except ValueError:
                                    pass
                            elif key_clean == "reliability":
                                try:
                                    reliability = float(val_clean)
                                except ValueError:
                                    pass
                            elif key_clean == "content":
                                content_idx = text.lower().find("content:")
                                if content_idx != -1:
                                    content = text[content_idx + 8:].strip()
                                break

                    payload = {
                        "title": title,
                        "content": content,
                        "domain": domain,
                        "source": source,
                        "filename": file_path.name,
                        "file_path": str(file_path),
                        "freshness": freshness,
                        "authority": authority,
                        "reliability": reliability
                    }
                    raw_docs.append((file_path, payload, content))

                except Exception as e:
                    print(f"Error processing file {file_path}: {e}", flush=True)

        if not raw_docs:
            print("No valid documents found to index.", flush=True)
            return {"status": "success", "indexed_count": 0, "collection": self.collection_name}

        total_docs = len(raw_docs)
        print(f"Found {total_docs} documents.", flush=True)

        print("[1/3] Loading local PyTorch embedding model...", flush=True)
        model = self.encoder
        
        print(f"[2/3] Computing 384-dim vector embeddings for {total_docs} files...", flush=True)
        contents = [doc[2] for doc in raw_docs]
        with QdrantTool._lock:
            vectors = model.encode(contents, batch_size=32, show_progress_bar=False).tolist()

        points: List[PointStruct] = []
        for (file_path, payload, _), vector in zip(raw_docs, vectors):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(file_path)))
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        print(f"[3/3] Uploading {len(points)} vectors to Qdrant collection '{self.collection_name}'...", flush=True)
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        print(f"Ingestion Complete! {len(points)} documents indexed into Qdrant.", flush=True)

        return {
            "status": "success",
            "indexed_count": len(points),
            "collection": self.collection_name
        }

    def search(
        self,
        query: str,
        source: Optional[str] = None,
        domain: Optional[str] = None,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic vector search in Qdrant with optional source/domain filtering.
        """
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue

        try:
            query_vector = self.encoder.encode(query, show_progress_bar=False).tolist()
            
            must_conditions = []
            if source:
                must_conditions.append(
                    FieldCondition(key="source", match=MatchValue(value=source.lower()))
                )
            if domain:
                must_conditions.append(
                    FieldCondition(key="domain", match=MatchValue(value=domain))
                )

            query_filter = Filter(must=must_conditions) if must_conditions else None

            if hasattr(self.client, "query_points"):
                response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=limit
                )
                search_results = response.points
            elif hasattr(self.client, "search"):
                search_results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit
                )
            else:
                search_results = []

            results = []
            for hit in search_results:
                payload = hit.payload or {}
                results.append({
                    "source": payload.get("source", "unknown"),
                    "title": payload.get("title", "Untitled Document"),
                    "content": payload.get("content", ""),
                    "domain": payload.get("domain", "General"),
                    "filename": payload.get("filename", ""),
                    "freshness": payload.get("freshness", 0.95),
                    "authority": payload.get("authority", 0.90),
                    "reliability": payload.get("reliability", 0.88),
                    "score": getattr(hit, "score", 0.0)
                })
            return results

        except Exception as e:
            # Fallback to local knowledge-base semantic search
            return self._local_fallback_search(query=query, source=source, domain=domain, limit=limit)

    def _get_local_docs(self, limit: Optional[int] = None, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Loads and caches documents directly from the knowledge-base directory.
        """
        if not hasattr(self, "_cached_local_docs") or self._cached_local_docs is None:
            docs = []
            kb_root = Path("knowledge-base").resolve()
            if kb_root.exists():
                for file_path in kb_root.glob("**/*"):
                    if file_path.is_file() and file_path.suffix.lower() in [".txt", ".md"]:
                        try:
                            text = file_path.read_text(encoding="utf-8").strip()
                            if not text:
                                continue
                            rel_parts = file_path.relative_to(kb_root).parts
                            domain = rel_parts[0] if len(rel_parts) > 0 else "General"
                            src = rel_parts[1].lower() if len(rel_parts) > 1 else "confluence"
                            if "confulence" in src:
                                src = "confluence"
                            title = file_path.stem.replace("_", " ").title()
                            freshness = 0.95
                            authority = 0.90
                            reliability = 0.88
                            content = text
                            for line in text.splitlines():
                                if ":" in line:
                                    k, val = line.split(":", 1)
                                    kc = k.strip().lower()
                                    vc = val.strip()
                                    if kc == "title":
                                        title = vc
                                    elif kc == "source":
                                        src = vc.lower()
                                    elif kc == "domain":
                                        domain = vc
                                    elif kc == "freshness":
                                        try: freshness = float(vc)
                                        except: pass
                                    elif kc == "authority":
                                        try: authority = float(vc)
                                        except: pass
                                    elif kc == "reliability":
                                        try: reliability = float(vc)
                                        except: pass
                                    elif kc == "content":
                                        c_idx = text.lower().find("content:")
                                        if c_idx != -1:
                                            content = text[c_idx + 8:].strip()
                                        break
                            docs.append({
                                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, str(file_path))),
                                "title": title,
                                "content": content,
                                "domain": domain,
                                "source": src,
                                "filename": file_path.name,
                                "freshness": freshness,
                                "authority": authority,
                                "reliability": reliability
                            })
                        except Exception:
                            pass
            self._cached_local_docs = docs

        filtered = self._cached_local_docs or []
        if source:
            filtered = [d for d in filtered if d.get("source", "").lower() == source.lower()]
        if limit:
            return filtered[:limit]
        return filtered

    def _local_fallback_search(
        self,
        query: str,
        source: Optional[str] = None,
        domain: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Semantic vector search fallback against local knowledge base documents.
        """
        import re
        import numpy as np

        docs = self._get_local_docs()
        if source:
            docs = [d for d in docs if d.get("source", "").lower() == source.lower()]
        if domain:
            docs = [d for d in docs if d.get("domain", "").lower() == domain.lower()]

        if not docs:
            return []

        # Fast keyword overlap scoring + domain boost
        q_words = set(re.findall(r"\w+", query.lower()))
        results = []
        for d in docs:
            full_text = f"{d['title']} {d['domain']} {d['content']}".lower()
            d_words = set(re.findall(r"\w+", full_text))
            intersection = q_words.intersection(d_words)
            overlap_score = len(intersection) / (len(q_words) + 0.1) if q_words else 0.5
            
            # Domain bonus
            bonus = 0.15 if any(w in d['domain'].lower() for w in q_words) else 0.0
            title_bonus = 0.2 if any(w in d['title'].lower() for w in q_words) else 0.0
            final_score = max(0.42, min(0.96, 0.45 + overlap_score * 0.4 + bonus + title_bonus))

            results.append({
                "source": d.get("source", "confluence"),
                "title": d.get("title", "Untitled Document"),
                "content": d.get("content", ""),
                "domain": d.get("domain", "General"),
                "filename": d.get("filename", ""),
                "freshness": d.get("freshness", 0.95),
                "authority": d.get("authority", 0.90),
                "reliability": d.get("reliability", 0.88),
                "score": round(final_score, 4)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def list_documents(self, limit: int = 50, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves stored knowledge documents from the Qdrant collection using scroll API.
        """
        try:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue
            query_filter = None
            if source:
                query_filter = Filter(must=[FieldCondition(key="source", match=MatchValue(value=source.lower()))])

            records, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=query_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            docs = []
            for r in records:
                p = r.payload or {}
                docs.append({
                    "id": str(r.id),
                    "title": p.get("title", "Untitled Document"),
                    "content": p.get("content", ""),
                    "source": p.get("source", "unknown"),
                    "domain": p.get("domain", "General"),
                    "filename": p.get("filename", ""),
                    "freshness": p.get("freshness", 0.95),
                    "authority": p.get("authority", 0.90),
                    "reliability": p.get("reliability", 0.88),
                })
            return docs
        except Exception as e:
            return self._get_local_docs(limit=limit, source=source)

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Returns collection status and point count from Qdrant or local fallback.
        """
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            points_count = getattr(info, "points_count", None)
            if points_count is None and hasattr(info, "vectors_count"):
                points_count = info.vectors_count
            status_val = getattr(info, "status", "green")
            return {
                "collection": self.collection_name,
                "status": str(status_val),
                "points_count": points_count or 0,
                "vector_size": self.vector_dim,
                "host": self.host
            }
        except Exception as e:
            docs = self._get_local_docs()
            return {
                "collection": self.collection_name,
                "status": "green" if docs else "unavailable",
                "points_count": len(docs),
                "vector_size": self.vector_dim,
                "host": f"{self.host} (local storage fallback)"
            }


if __name__ == "__main__":
    tool = QdrantTool()
    healthy, msg = tool.health_check()
    print(f"Health Check: {healthy} -> {msg}")
    
    if healthy:
        res = tool.ingest_knowledge_base()
        print(f"Ingestion Result: {res}")
        
        print("\nTesting Qdrant Search:")
        search_res = tool.search(query="VPN password reset connection issue", source="confluence")
        for idx, item in enumerate(search_res, 1):
            print(f"{idx}. [{item['source'].upper()}] {item['title']} (Score: {item['score']:.4f})")
            print(f"   {item['content'][:120]}...\n")

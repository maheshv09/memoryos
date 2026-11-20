from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from connectors import ConnectorManager
from google_ai import status as google_ai_status
from llm_router import route_completion
from memory_engine import MemoryEngine
from models import (
    ChatRequest,
    GraphResponse,
    MemoryCreateRequest,
    MemoryExportResponse,
    MemoryImportRequest,
    MemoryItem,
    PersonaId,
)

BASE_DIR = Path(__file__).resolve().parent
STORE_PATH = os.getenv("MEMORY_STORE_PATH", "data/memory_store.json")
if not Path(STORE_PATH).is_absolute():
    STORE_PATH = str(BASE_DIR / STORE_PATH)

engine = MemoryEngine(store_path=STORE_PATH, seed=True)
connector_manager = ConnectorManager(engine)

app = FastAPI(title="MemoryOS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestRequest(MemoryCreateRequest):
    pass


def _demo_docs(persona: PersonaId, era: int) -> List[Dict[str, Any]]:
    personal = [
        {"connector": "web_article", "title": "The Quiet Discipline of Paying Attention", "content": "Attention is the rarest form of generosity. A life is not measured by how much you notice, but by how deeply you stay with what matters. The practice is simple and difficult: return to the same question, the same person, the same craft, long after the novelty has gone.", "year": 2024, "source_type": "web_article", "source_label": "https://example.com/attention"},
        {"connector": "rss_feed", "title": "The Long Now — Issue 118", "content": "Deep technology is a patience game. The teams that endure are not the ones with the loudest launch, but the ones that build repair loops into the product and the culture. ISO-20022 migration, memory systems, and trustworthy AI all reward the same virtue: staying in the room after the first failure.", "year": 2024, "source_type": "rss_feed", "source_label": "https://example.com/feed"},
        {"connector": "calendar", "title": "Family dinner — Sunday, 12 March 2024", "content": "Recurring family dinner at home. Dad asked about the startup decision and whether the risk was honest. The conversation moved from salary to temperament, then to the kind of person who can repair things at 3 a.m.", "year": 2024, "source_type": "calendar", "source_label": "family.ics"},
        {"connector": "bookmarks", "title": "Bookmarked: The Art of Doing Science and Engineering", "content": "Richard Hamming's lecture on doing important work. Bookmarked for the line about courage and the willingness to work on problems that matter even when the path is unclear.", "year": 2024, "source_type": "bookmarks", "source_label": "bookmarks.html"},
        {"connector": "kindle", "title": "Kindle highlights — Deep Work", "content": "[Highlight] Clarity about what matters provides clarity about what does not.\n\n[Highlight] Less mental clutter means more mental resources for the work that deserves them.", "year": 2024, "source_type": "kindle", "source_label": "My Clippings.txt"},
        {"connector": "whatsapp", "title": "WhatsApp family chat — 12 March 2024", "content": "[12/03/2024, 9:12:00 PM] Dad: Never confuse being agreeable with being kind.\n[12/03/2024, 9:14:00 PM] Me: I'm scared of leaving the stable job.\n[12/03/2024, 9:18:00 PM] Dad: Fear is legitimate. A startup is not a gamble; it is a machine for discovering what breaks.", "year": 2024, "source_type": "whatsapp", "source_label": "WhatsApp Chat.txt"},
        {"connector": "obsidian", "title": "Obsidian — On building with patience", "content": "The best systems are built by people who expect to repair them. Write down the failure modes before the launch. Keep a decision log. Return to first principles when the room gets loud.", "year": 2024, "source_type": "obsidian", "source_label": "vault/patience.md"},
        {"connector": "apple_notes", "title": "Apple Notes — Questions for Dad", "content": "What did you learn only after you were already committed? How did you know the risk was honest? What would you do differently if you were not afraid of embarrassment?", "year": 2024, "source_type": "apple_notes", "source_label": "Notes.app"},
        {"connector": "voice_memos", "title": "Voice memo — Sunday walk reflection", "content": "Transcript: I keep waiting for certainty before I move. But certainty is not a precondition for a good decision; it is often the reward for surviving the decision. The question is whether I can endure the embarrassment of being wrong.", "year": 2024, "source_type": "voice_memos", "source_label": "Sunday Walk.m4a"},
    ]
    enterprise = [
        {"connector": "rss_feed", "title": "Deep Tech Weekly — Issue 42", "content": "This issue tracks the ISO-20022 migration, the rise of memory layers for enterprise agents, and the operational cost of stale context. The through-line is provenance: every answer needs a source, a timestamp, and a way to be corrected.", "year": 2024, "source_type": "rss_feed", "source_label": "https://example.com/deep-tech/feed"},
        {"connector": "web_article", "title": "Designing a Memory Layer for the Enterprise", "content": "A practical memory layer needs ingestion, redaction, entity resolution, hybrid retrieval, and graph links. The hard part is not storage; it is trust. Teams need to see where a memory came from and why it was retrieved.", "year": 2024, "source_type": "web_article", "source_label": "https://example.com/enterprise-memory"},
        {"connector": "calendar", "title": "Architecture review — 14 March 2024", "content": "Reviewed the incremental sync cursor, the retry budget, and the PII redaction boundary. Decision: keep the cursor opaque, add a dead-letter queue, and require a human review for connector scopes that touch regulated data.", "year": 2024, "source_type": "calendar", "source_label": "architecture.ics"},
        {"connector": "bookmarks", "title": "Bookmarked: Designing Data-Intensive Applications", "content": "Reference for the retrieval and storage design. Key chapters: replication, partitioning, and the trade-offs between batch and stream processing.", "year": 2024, "source_type": "bookmarks", "source_label": "bookmarks.html"},
        {"connector": "file_import", "title": "ISO-20022 migration memo", "content": "The migration is not a schema change; it is a coordination problem. The critical path runs through reconciliation, exception handling, and the audit trail. Every transformation must be reproducible.", "year": 2024, "source_type": "file_import", "source_label": "iso20022-memo.md"},
        {"connector": "github", "title": "GitHub — PR #184: Add incremental sync cursor", "content": "Adds an opaque cursor to the connector sync contract, persists it per source, and retries failed pages with exponential backoff. Reviewed by the platform team; follow-up is a dead-letter queue for malformed records.", "year": 2024, "source_type": "github", "source_label": "https://github.com/example/memoryos/pull/184"},
        {"connector": "kindle", "title": "Kindle highlights — The Manager's Path", "content": "[Highlight] The goal of a manager is not to make every decision; it is to build a team that can make good decisions without you.\n\n[Highlight] Feedback is a gift, but only when it is specific, timely, and tied to observable behavior.", "year": 2024, "source_type": "kindle", "source_label": "My Clippings.txt"},
        {"connector": "obsidian", "title": "Obsidian — Incident postmortem notes", "content": "Incident: stale connector cursor caused duplicate ingestion. Root cause: the cursor was stored in memory instead of durable storage. Fix: persist the cursor, add idempotency keys, and alert on duplicate-rate spikes.", "year": 2024, "source_type": "obsidian", "source_label": "vault/incident-2024-03.md"},
    ]
    return personal if persona == "personal" else enterprise


def _sse(event: str, payload: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _oauth_base(request: Request) -> str:
    return (os.getenv("PUBLIC_BASE_URL") or str(request.base_url)).rstrip("/")


def _chunk_text(text: str, size: int = 26) -> List[str]:
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size
    return chunks or [""]


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "MemoryOS",
        "engine": "ready",
        "stats": engine.stats(),
        "providers": {
            "primary": bool(os.getenv("GROQ_API_KEY")),
            "fallback": bool(os.getenv("GEMINI_API_KEY")),
        },
    }


@app.get("/memories")
async def list_memories(
    persona: Optional[PersonaId] = None,
    era: int = 2026,
    category: Optional[str] = None,
    q: Optional[str] = None,
):
    items = engine.list_memories(persona=persona, era=era, category=category)
    if q:
        ql = q.lower()
        items = [m for m in items if ql in (m.title + " " + m.content + " " + " ".join(m.tags)).lower()]
    return {"memories": [m.model_dump() for m in items]}


@app.get("/memory/{memory_id}")
async def get_memory(memory_id: str):
    item = engine.get(memory_id)
    if not item:
        raise HTTPException(status_code=404, detail="Memory not found")
    return item.model_dump()


@app.post("/memory")
async def create_memory(req: MemoryCreateRequest):
    item = engine.create_from_request(req)
    return item.model_dump()


@app.get("/graph", response_model=GraphResponse)
async def graph(persona: PersonaId, era: int = 2026, active: Optional[str] = None):
    active_ids = set(active.split(",")) if active else set()
    nodes, edges = engine.graph(persona, era, active_ids)
    return GraphResponse(nodes=nodes, edges=edges)


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    async def gen():
        start = time.time()
        messages = [m.model_dump() for m in req.messages]
        retrieved_pairs = engine.retrieve(req.persona, messages[-1]["content"] if messages else "", req.era, req.top_k)
        retrieved = []
        for m, score in retrieved_pairs:
            d = m.model_dump()
            d["_score"] = round(float(score), 4)
            retrieved.append(d)
        active_ids = [m["id"] for m in retrieved]

        yield _sse("retrieval", {"memories": retrieved, "active_ids": active_ids, "era": req.era})

        try:
            text, provider, model, fallback, rate_limited, local_fallback = await route_completion(
                req.provider,
                [{"role": m["role"], "content": m["content"]} for m in messages],
                req.persona.value,
                req.era,
                retrieved,
            )
        except Exception as exc:
            text = f"I hit an unexpected error: {exc}"
            provider = "Local Neural Fallback"
            model = "Deterministic Persona Engine"
            fallback = True
            rate_limited = False
            local_fallback = True

        for chunk in _chunk_text(text, 24):
            yield _sse("token", {"text": chunk})
            await asyncio.sleep(0.012)

        latency = int((time.time() - start) * 1000)
        citations = [{"id": m["id"], "title": m["title"], "year": m["year"], "score": m.get("_score")} for m in retrieved]
        telemetry = {
            "provider": provider,
            "model": model,
            "latency_ms": latency,
            "fallback": fallback,
            "rate_limited": rate_limited,
            "local_fallback": local_fallback,
        }
        yield _sse("done", {"telemetry": telemetry, "citations": citations, "active_ids": active_ids})

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/ingest/stream")
async def ingest_stream(req: IngestRequest):
    async def gen():
        yield _sse("stage", {"stage": "Source Acquisition", "progress": 5, "detail": "Receiving source payload and validating format..."})
        await asyncio.sleep(0.2)
        yield _sse("stage", {"stage": "Format Detection", "progress": 12, "detail": f"Detected source type: {req.source_type}. Normalizing encoding..."})
        await asyncio.sleep(0.2)
        yield _sse("stage", {"stage": "Parsing & Normalization", "progress": 24, "detail": "Parsing content into canonical memory text..."})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "PII & Secret Redaction", "progress": 36, "detail": "Scanning for emails, phone numbers, and sensitive identifiers..."})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "Entity Extraction", "progress": 48, "detail": "Extracting people, systems, technologies, and topics..."})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "Cognitive Fingerprinting", "progress": 60, "detail": "Inferring emotional tone, traits, and category..."})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "Deduplication Check", "progress": 72, "detail": "Comparing against existing memories for duplicates or conflicts..."})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "Semantic Indexing", "progress": 84, "detail": "Hashing lexical + character n-gram vectors and normalizing..."})
        await asyncio.sleep(0.25)
        item = engine.create_from_request(req)
        yield _sse("stage", {"stage": "Synaptic Graph Linking", "progress": 92, "detail": "Linking new node to nearest memories and updating constellation...", "entities": item.entities, "quality_score": item.quality_score, "redacted": item.redacted, "duplicate_of": item.duplicate_of})
        await asyncio.sleep(0.25)
        yield _sse("stage", {"stage": "Quality Scoring & Commit", "progress": 100, "detail": f"Memory crystallized with quality score {item.quality_score}.", "memory_id": item.id, "entities": item.entities, "quality_score": item.quality_score, "redacted": item.redacted, "duplicate_of": item.duplicate_of})
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/export")
async def export_memories(persona: Optional[PersonaId] = None):
    items = engine.export_memories(persona=persona)
    return MemoryExportResponse(memories=items).model_dump()


@app.post("/import")
async def import_memories(req: MemoryImportRequest):
    count = engine.import_memories(req.memories, replace=req.replace)
    return {"imported": count, "stats": engine.stats()}


@app.post("/reset")
async def reset_memories():
    engine.reset()
    return {"reset": True, "stats": engine.stats()}


@app.get("/insights")
async def insights(persona: PersonaId, era: int = 2026):
    return engine.insights(persona, era)


@app.get("/activity")
async def activity(limit: int = 20):
    return {"events": engine.activity[:limit]}


@app.get("/memory-of-the-day")
async def memory_of_the_day(persona: PersonaId, era: int = 2026):
    item = engine.memory_of_the_day(persona, era)
    if not item:
        raise HTTPException(status_code=404, detail="No memory available")
    return item.model_dump()


@app.get("/search")
async def search_memories(persona: PersonaId, q: str, era: int = 2026, top_k: int = 8):
    pairs = engine.retrieve(persona, q, era, top_k)
    return {
        "query": q,
        "results": [{"score": round(float(s), 4), **m.model_dump()} for m, s in pairs],
    }


@app.post("/narrate")
async def narrate(payload: Dict[str, Any]):
    persona = PersonaId(payload.get("persona", "personal"))
    memory_ids = payload.get("memory_ids", [])
    era = int(payload.get("era", 2026))
    memories = []
    for mid in memory_ids:
        item = engine.get(mid)
        if item and item.persona == persona and item.year <= era:
            d = item.model_dump()
            d["_score"] = 1.0
            memories.append(d)
    if not memories:
        raise HTTPException(status_code=404, detail="No memories found")
    from llm_router import route_completion

    text, provider, model, fallback, rate_limited, local_fallback = await route_completion(
        "auto",
        [{"role": "user", "content": "Weave these memories into a short, beautiful, emotionally intelligent narrative with citations."}],
        persona.value,
        era,
        memories,
    )
    return {
        "narrative": text,
        "telemetry": {
            "provider": provider,
            "model": model,
            "fallback": fallback,
            "rate_limited": rate_limited,
            "local_fallback": local_fallback,
        },
        "memories": [{"id": m["id"], "title": m["title"], "year": m["year"]} for m in memories],
    }


@app.get("/connectors")
async def list_connectors():
    return {"connectors": connector_manager.list_connectors()}


@app.post("/connectors/{connector_id}/connect")
async def connect_connector(connector_id: str):
    try:
        return connector_manager.connect_local(connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/connectors/{connector_id}/disconnect")
async def disconnect_connector(connector_id: str):
    try:
        return connector_manager.disconnect(connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/connectors/{connector_id}/sync")
async def sync_connector(connector_id: str, persona: PersonaId, era: int = 2026):
    try:
        return await connector_manager.sync(connector_id, persona, era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Connector sync failed: {str(exc)[:300]}")


@app.post("/connectors/{connector_id}/fetch")
async def fetch_connector_source(
    connector_id: str,
    persona: PersonaId,
    url: str = Query(..., min_length=8),
    era: int = 2026,
):
    try:
        return await connector_manager.fetch_source(connector_id, url, persona, era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"URL ingestion failed: {str(exc)[:300]}")


@app.post("/connectors/{connector_id}/import")
async def import_connector_file(
    connector_id: str,
    persona: PersonaId,
    file: UploadFile = File(...),
    year: Optional[int] = None,
):
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB")
    filename = file.filename or "upload"
    content_type = file.content_type or ""
    try:
        if connector_id == "voice_memos" and (content_type.startswith("audio/") or filename.lower().endswith((".mp3", ".m4a", ".wav", ".ogg", ".webm"))):
            transcript = await connector_manager.transcribe_audio(filename, data)
            if not transcript.strip():
                raise ValueError("No speech detected in audio.")
            item = engine.create_from_request(
                MemoryCreateRequest(
                    persona=persona,
                    title=f"Voice memo — {filename}",
                    content=transcript,
                    tags=["voice_memos", "audio-transcript"],
                    year=year or 2026,
                    source_type="voice_memos",
                    source_connector="voice_memos",
                    source_label=filename,
                    metadata={"filename": filename, "transcribed": True},
                )
            )
            return {"connector": connector_id, "ingested": 1, "memory_ids": [item.id]}
        return await connector_manager.import_file(connector_id, filename, data, persona, year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Import failed: {str(exc)[:300]}")


@app.get("/connectors/{connector_id}/logs")
async def connector_logs(connector_id: str):
    return {"logs": connector_manager.get_logs(connector_id)}


@app.get("/oauth/{connector_id}/authorize")
async def oauth_authorize(connector_id: str, request: Request):
    redirect_uri = _oauth_base(request) + f"/oauth/{connector_id}/callback"
    try:
        info = connector_manager.authorization_url(connector_id, redirect_uri)
        return {**info, "redirect_uri": redirect_uri}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/oauth/{connector_id}/callback")
async def oauth_callback(connector_id: str, request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    redirect_uri = _oauth_base(request) + f"/oauth/{connector_id}/callback"
    if error or not code:
        return HTMLResponse(f"<h3>Connection cancelled</h3><p>{error or 'Missing authorization code'}</p>")
    try:
        await connector_manager.exchange_code(connector_id, code, redirect_uri, state)
    except Exception as exc:
        return HTMLResponse(f"<h3>Connection failed</h3><p>{str(exc)[:300]}</p>")
    frontend = os.getenv("FRONTEND_URL", "*")
    return HTMLResponse(
        "<html><body style='font-family:system-ui;background:#f7f3ec;padding:40px'>"
        "<h2 style='color:#1f2937'>MemoryOS connected</h2>"
        f"<p style='color:#64748b'>{connector_id} is now authorized. This window will close.</p>"
        "<script>if(window.opener){window.opener.postMessage({type:'memoryos-connected',connector:'"
        + connector_id
        + "'}, '"
        + frontend
        + "');}setTimeout(()=>window.close(),700);</script></body></html>"
    )


@app.post("/demo/ingest")
async def demo_ingest(persona: PersonaId, era: int = 2026):
    created = []
    existing = {(m.title, m.source_connector) for m in engine.list_memories(persona=persona)}
    for doc in _demo_docs(persona, era):
        if (doc["title"], doc["connector"]) in existing:
            continue
        item = engine.create_from_request(
            MemoryCreateRequest(
                persona=persona,
                title=doc["title"],
                content=doc["content"],
                tags=["demo-pack", doc["connector"]],
                year=doc.get("year", era),
                source_type=doc.get("source_type", doc["connector"]),
                source_connector=doc["connector"],
                source_label=doc.get("source_label"),
                metadata={"demo": True, "connector": doc["connector"]},
            )
        )
        created.append(item.id)
        existing.add((doc["title"], doc["connector"]))
    return {"ingested": len(created), "memory_ids": created, "persona": persona}


@app.get("/google-ai/status")
async def google_ai_stack_status():
    return google_ai_status()


@app.get("/stats")
async def stats():
    return engine.stats()


# Single-container deployment (Cloud Run): serve the built frontend when present.
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

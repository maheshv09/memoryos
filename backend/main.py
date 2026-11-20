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
from google_ai import MCP_TOOLS, status as google_ai_status
from llm_router import analyze_multimodal_memory, route_completion, simulate_decision
from memory_engine import MemoryEngine
from models import (
    ChatRequest,
    GraphResponse,
    MemoryCreateRequest,
    MemoryExportResponse,
    MemoryImportRequest,
    PersonaId,
)

BASE_DIR = Path(__file__).resolve().parent
STORE_PATH = os.getenv("MEMORY_STORE_PATH", "data/memory_store.json")
if not Path(STORE_PATH).is_absolute():
    STORE_PATH = str(BASE_DIR / STORE_PATH)

engine = MemoryEngine(store_path=STORE_PATH, seed=True)
connector_manager = ConnectorManager(engine)

app = FastAPI(title="MemoryOS", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestRequest(MemoryCreateRequest):
    pass


class RawConnectorIngestRequest(BaseModel):
    persona: PersonaId = PersonaId.personal
    title: str = ""
    content: str
    era: int = 2026
    source_label: Optional[str] = None


class MultimodalIngestRequest(BaseModel):
    persona: PersonaId = PersonaId.personal
    image_b64: str = ""
    mime_type: str = "image/jpeg"
    hint: str = ""
    era: int = 2026
    auto_crystallize: bool = True


class SimulateDecisionRequest(BaseModel):
    persona: PersonaId = PersonaId.personal
    dilemma: str
    era: int = 2026
    top_k: int = 5


class AnalyzePreviewRequest(BaseModel):
    persona: PersonaId = PersonaId.personal
    title: str = ""
    content: str
    year: int = 2026


class MCPExecuteRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}


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


def _chunk_text(text: str, size: int = 28) -> List[str]:
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
        "version": "2.0.0",
        "engine": "ready",
        "stats": engine.stats(),
        "providers": {
            "primary": bool(os.getenv("GROQ_API_KEY")),
            "fallback": bool(os.getenv("GEMINI_API_KEY")),
            "google_ai_suite": True,
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


@app.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    if memory_id not in engine.memories:
        raise HTTPException(status_code=404, detail="Memory not found")
    removed = engine.memories.pop(memory_id)
    engine._log_activity("deleted", memory_id, removed.title)
    engine._persist()
    return {"deleted": True, "id": memory_id, "stats": engine.stats()}


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
            provider = "Gemma Edge Fallback"
            model = "Deterministic Persona Engine"
            fallback = True
            rate_limited = False
            local_fallback = True

        for chunk in _chunk_text(text, 26):
            yield _sse("token", {"text": chunk})
            await asyncio.sleep(0.01)

        latency = int((time.time() - start) * 1000)
        citations = [{"id": m["id"], "title": m["title"], "year": m["year"], "score": m.get("_score"), "category": m.get("category")} for m in retrieved]
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
        yield _sse("stage", {"stage": "1. Source Acquisition", "progress": 8, "detail": "Receiving source payload and validating canonical UTF-8 format..."})
        await asyncio.sleep(0.15)
        yield _sse("stage", {"stage": "2. Format Detection", "progress": 18, "detail": f"Detected source type: {req.source_type}. Normalizing structure..."})
        await asyncio.sleep(0.15)
        yield _sse("stage", {"stage": "3. Gemma 3 Edge PII Redaction", "progress": 32, "detail": "Gemma Edge Shield scanning for emails, phone numbers, and secrets..."})
        await asyncio.sleep(0.18)
        yield _sse("stage", {"stage": "4. Gemini Entity Extraction", "progress": 48, "detail": "Extracting people, systems, technologies, and decision boundaries..."})
        await asyncio.sleep(0.18)
        yield _sse("stage", {"stage": "5. Cognitive Fingerprinting", "progress": 64, "detail": "Inferring emotional tone, cognitive traits, and memory category..."})
        await asyncio.sleep(0.18)
        yield _sse("stage", {"stage": "6. Hybrid Semantic Indexing", "progress": 80, "detail": "Computing 1536-dim lexical + character n-gram vectors & checking duplicates..."})
        await asyncio.sleep(0.18)
        item = engine.create_from_request(req)
        yield _sse("stage", {"stage": "7. Synaptic Graph Linking", "progress": 93, "detail": "Linking new node to nearest memories in the Neural Constellation...", "entities": item.entities, "quality_score": item.quality_score, "redacted": item.redacted, "duplicate_of": item.duplicate_of})
        await asyncio.sleep(0.15)
        yield _sse("stage", {"stage": "Crystallized & Committed", "progress": 100, "detail": f"Memory crystallized with quality score {int(item.quality_score * 100)}%.", "memory_id": item.id, "entities": item.entities, "quality_score": item.quality_score, "redacted": item.redacted, "duplicate_of": item.duplicate_of, "memory": item.model_dump()})
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/ai/analyze")
async def ai_analyze_preview(req: AnalyzePreviewRequest):
    """Runs Gemma 3 Edge PII redaction + Gemini cognitive trait & entity extraction preview."""
    redacted_text = ConnectorManager.redact_pii(req.content)
    was_redacted = redacted_text != req.content
    entities = ConnectorManager.extract_entities(redacted_text)
    category = engine._infer_category(redacted_text, req.persona)
    tone = engine._infer_tone(redacted_text)
    traits = engine._infer_traits(redacted_text)
    quality = engine._quality_score(redacted_text, traits, entities)
    duplicate_of = engine._find_duplicate(req.persona, redacted_text, req.year)
    return {
        "original_length": len(req.content),
        "redacted": was_redacted,
        "redacted_content": redacted_text,
        "entities": entities,
        "category": category.value,
        "emotional_tone": tone,
        "cognitive_traits": traits,
        "quality_score": quality,
        "duplicate_of": duplicate_of,
        "models_used": ["Gemma 3 Edge Shield", "Gemini 2.5 Flash", "Nano Banana Visual Engram"],
    }


@app.post("/ai/multimodal")
async def ai_multimodal_ingest(req: MultimodalIngestRequest):
    """Uses Gemini Omni to extract and optionally crystallize a memory from an image, handwritten letter, or whiteboard diagram."""
    extracted = await analyze_multimodal_memory(req.image_b64, req.mime_type, req.persona.value, req.hint)
    memory_dump = None
    if req.auto_crystallize:
        item = engine.create_from_request(
            MemoryCreateRequest(
                persona=req.persona,
                title=extracted.get("title", "Gemini Omni Visual Memory"),
                content=extracted.get("content", ""),
                tags=["gemini-omni", "multimodal-vision", *(extracted.get("entities", [])[:3])],
                year=min(req.era, int(extracted.get("year", req.era))),
                emotional_tone=extracted.get("emotional_tone"),
                cognitive_traits=extracted.get("cognitive_traits", []),
                entities=extracted.get("entities", []),
                source_type="gemini_omni_vision",
                source_connector="manual",
                source_label="Gemini Omni Multimodal Vision",
                metadata={"visual_summary": extracted.get("visual_summary", ""), "model": extracted.get("model", "Gemini Omni")},
            )
        )
        memory_dump = item.model_dump()
    return {
        "extracted": extracted,
        "crystallized": memory_dump,
    }


@app.post("/ai/simulate")
async def ai_simulate_decision(req: SimulateDecisionRequest):
    """Runs the What-Would-I-Do Decision & Enterprise Handover Simulator."""
    pairs = engine.retrieve(req.persona, req.dilemma, req.era, req.top_k)
    retrieved = []
    for m, score in pairs:
        d = m.model_dump()
        d["_score"] = round(float(score), 4)
        retrieved.append(d)
    result = await simulate_decision(req.persona.value, req.dilemma, req.era, retrieved)
    result["active_ids"] = [m["id"] for m in retrieved]
    return result


@app.get("/mcp/tools")
async def mcp_list_tools():
    return {
        "protocol": "Model Context Protocol (MCP) / Google Agent Skills 1.0",
        "server": "memoryos-neural-core",
        "version": "2.0.0",
        "tools": MCP_TOOLS,
    }


@app.post("/mcp/execute")
async def mcp_execute_tool(req: MCPExecuteRequest):
    tool = req.tool
    args = req.arguments or {}
    persona = PersonaId(args.get("persona", "personal"))
    era = int(args.get("era", 2026))

    if tool == "memoryos.retrieve_memories":
        query = str(args.get("query", "important decisions and core values"))
        top_k = int(args.get("top_k", 4))
        pairs = engine.retrieve(persona, query, era, top_k)
        return {
            "tool": tool,
            "status": "success",
            "results": [
                {
                    "id": m.id,
                    "title": m.title,
                    "year": m.year,
                    "category": m.category.value,
                    "score": round(float(s), 4),
                    "content": m.content,
                    "source_label": m.source_label,
                }
                for m, s in pairs
            ],
        }
    if tool == "memoryos.simulate_decision":
        dilemma = str(args.get("dilemma", "Should we prioritize speed or safety invariants?"))
        pairs = engine.retrieve(persona, dilemma, era, 4)
        retrieved = [{**m.model_dump(), "_score": round(float(s), 4)} for m, s in pairs]
        sim = await simulate_decision(persona.value, dilemma, era, retrieved)
        return {"tool": tool, "status": "success", "simulation": sim}

    if tool == "memoryos.audit_commitments":
        mems = engine.list_memories(persona=persona, era=era)
        invariants = [
            {"id": m.id, "title": m.title, "year": m.year, "category": m.category.value, "tone": m.emotional_tone}
            for m in mems[:8]
        ]
        return {
            "tool": tool,
            "status": "success",
            "persona": persona.value,
            "total_audited": len(mems),
            "key_commitments_and_records": invariants,
        }

    if tool == "memoryos.gemma_redact":
        raw = str(args.get("content", "Contact arjun.mehta@barclays-core.com or +44 7700 900412 regarding ADR-014."))
        redacted = ConnectorManager.redact_pii(raw)
        entities = ConnectorManager.extract_entities(redacted)
        return {
            "tool": tool,
            "status": "success",
            "original": raw,
            "redacted": redacted,
            "pii_detected": raw != redacted,
            "entities": entities,
            "model": "Gemma 3 Edge Privacy Shield",
        }

    raise HTTPException(status_code=400, detail=f"Unknown MCP tool: {tool}")


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
        # If no specific IDs passed, weave top 4 memories for this persona
        for m in engine.list_memories(persona=persona, era=era)[:4]:
            d = m.model_dump()
            d["_score"] = 1.0
            memories.append(d)
    if not memories:
        raise HTTPException(status_code=404, detail="No memories found")

    text, provider, model, fallback, rate_limited, local_fallback = await route_completion(
        "auto",
        [{"role": "user", "content": "Weave these memories into a short, profound, emotionally intelligent first-person narrative with [Memory: Title (Year)] citations."}],
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


@app.get("/connectors/{connector_id}/sample")
async def get_connector_sample(connector_id: str, persona: PersonaId = PersonaId.personal):
    return connector_manager.get_sample_payload(connector_id, persona)


@app.post("/connectors/{connector_id}/connect")
async def connect_connector(connector_id: str, mode: str = "sandbox"):
    try:
        return connector_manager.connect_local(connector_id, mode=mode)
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


@app.post("/connectors/{connector_id}/ingest-raw")
async def ingest_raw_connector(connector_id: str, req: RawConnectorIngestRequest):
    try:
        return await connector_manager.ingest_raw_payload(
            connector_id=connector_id,
            title=req.title,
            content=req.content,
            persona=req.persona,
            era=req.era,
            source_label=req.source_label,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Direct ingestion failed: {str(exc)[:300]}")


@app.post("/connectors/github/public")
async def sync_public_github(
    persona: PersonaId = PersonaId.enterprise,
    target: str = Query(..., min_length=2),
    era: int = 2026,
):
    try:
        return await connector_manager.sync_public_github(target=target, persona=persona, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GitHub public fetch failed: {str(exc)[:300]}")


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
            return {"connector": connector_id, "ingested": 1, "memory_ids": [item.id], "memories": [item.model_dump()]}
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
        "<html><body style='font-family:system-ui;background:#080a14;color:#f8fafc;padding:40px'>"
        "<h2 style='color:#f3cf79'>MemoryOS Connected</h2>"
        f"<p style='color:#94a3b8'>{connector_id} is now authorized. This window will close automatically.</p>"
        "<script>if(window.opener){window.opener.postMessage({type:'memoryos-connected',connector:'"
        + connector_id
        + "'}, '"
        + frontend
        + "');}setTimeout(()=>window.close(),700);</script></body></html>"
    )


@app.post("/demo/ingest")
async def demo_ingest(persona: PersonaId, era: int = 2026):
    created = []
    created_items = []
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
        created_items.append(item.model_dump())
        existing.add((doc["title"], doc["connector"]))
    return {"ingested": len(created), "memory_ids": created, "memories": created_items, "persona": persona}


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

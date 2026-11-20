from __future__ import annotations

import os
from typing import Any, Dict, List


STACK: List[Dict[str, Any]] = [
    {
        "id": "gemini",
        "name": "Gemini 2.5 Flash",
        "category": "Models",
        "role": "Primary cognitive reasoning, memory extraction, decision simulation, and temporal grounding.",
        "tier": "Live Active",
        "detail": "Powers the Conversational Digital Twin, Narrative Weaver, and What-Would-I-Do Decision Simulator with automatic high-throughput failover.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
        "feature_route": "/chat/stream",
    },
    {
        "id": "gemini-omni",
        "name": "Gemini Omni",
        "category": "Models",
        "role": "Multimodal vision, handwritten letter transcription, whiteboard ADR diagrams, and audio ingestion.",
        "tier": "Multimodal Live",
        "detail": "Extracts structured episodic and architectural memories directly from photos, diagrams, documents, and voice recordings.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
        "feature_route": "/ai/multimodal",
    },
    {
        "id": "nano-banana",
        "name": "Nano Banana",
        "category": "Models",
        "role": "Visual memory engram synthesis, neural artifact cards, and visual scene generation.",
        "tier": "Visual Engine",
        "detail": "Synthesizes bespoke visual memory engram cards encoding emotional tone, era geometry, cognitive traits, and provenance signatures.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
        "feature_route": "/ai/analyze",
    },
    {
        "id": "gemini-live",
        "name": "Gemini Live",
        "category": "Models",
        "role": "Real-time bidirectional voice consciousness interface with live waveform telemetry.",
        "tier": "Voice Studio",
        "detail": "Low-latency spoken conversation with your Personal Legacy Twin or Enterprise Knowledge Twin, complete with live synaptic firing.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
        "feature_route": "/chat/stream",
    },
    {
        "id": "lyria",
        "name": "Lyria Sonic Resonance",
        "category": "Models",
        "role": "Procedural ambient cognitive soundscape tuned to memory emotional tone and temporal era.",
        "tier": "Audio Synth",
        "detail": "Generates real-time harmonic WebAudio soundscapes mapped to the active memory's emotional fingerprint (warm, analytical, reflective).",
        "env": [],
        "live": True,
        "feature_route": "/memory-of-the-day",
    },
    {
        "id": "gemma",
        "name": "Gemma 3 Edge Shield",
        "category": "Models",
        "role": "On-device / edge privacy guard for local PII redaction, secret scanning, and trait classification.",
        "tier": "Edge Privacy",
        "detail": "Scans and strips emails, phone numbers, keys, and regulated identifiers locally before memories are indexed or sent to cloud models.",
        "env": ["VERTEXAI_PROJECT"],
        "live": True,
        "feature_route": "/ai/analyze",
    },
    {
        "id": "ai-studio",
        "name": "Google AI Studio",
        "category": "Tools",
        "role": "System instruction lab, persona voice calibration, and structured JSON schema evaluation.",
        "tier": "Connected",
        "detail": "Uses Google AI Studio API credentials and prompt guardrails for zero-hallucination citation grounding.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
        "feature_route": "/google-ai/status",
    },
    {
        "id": "antigravity",
        "name": "Google Antigravity",
        "category": "Tools",
        "role": "Agentic full-stack engineering, multi-stage ingestion workflow orchestration, and Cloud Run packaging.",
        "tier": "Built With",
        "detail": "Architected and accelerated with Google Antigravity agentic workflows for production-grade UX and cloud deployment.",
        "env": [],
        "live": True,
        "feature_route": "/google-ai/status",
    },
    {
        "id": "agent-skills",
        "name": "Google Agent Skills (MCP)",
        "category": "Tools",
        "role": "Exposes MemoryOS as a universal Model Context Protocol server for external AI agents.",
        "tier": "4 Live Tools",
        "detail": "Provides retrieve_memories, simulate_decision, audit_commitments, and gemma_redact as live callable agent skills.",
        "env": [],
        "live": True,
        "feature_route": "/mcp/tools",
    },
    {
        "id": "google-cloud",
        "name": "Google Cloud Run & Vertex AI",
        "category": "Deploy",
        "role": "Single-container Cloud Run deployment, Cloud Build CI/CD, Secret Manager, and Vertex vector index.",
        "tier": "Cloud Ready",
        "detail": "Containerized multi-stage Docker build serving FastAPI + React on Google Cloud Run with regional data residency.",
        "env": ["VERTEXAI_PROJECT", "VERTEXAI_LOCATION"],
        "live": True,
        "feature_route": "/health",
    },
]


MCP_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "memoryos.retrieve_memories",
        "description": "Retrieve provenance-backed memories for a persona up to a temporal era cutoff using hybrid semantic + lexical vector search.",
        "input_schema": {
            "type": "object",
            "properties": {
                "persona": {"type": "string", "enum": ["personal", "enterprise"]},
                "query": {"type": "string"},
                "era": {"type": "integer", "default": 2026},
                "top_k": {"type": "integer", "default": 4},
            },
            "required": ["persona", "query"],
        },
    },
    {
        "name": "memoryos.simulate_decision",
        "description": "Simulate how the Personal Legacy Twin or Enterprise Knowledge Twin would decide on a high-stakes dilemma based on historical memories.",
        "input_schema": {
            "type": "object",
            "properties": {
                "persona": {"type": "string", "enum": ["personal", "enterprise"]},
                "dilemma": {"type": "string"},
                "era": {"type": "integer", "default": 2026},
            },
            "required": ["persona", "dilemma"],
        },
    },
    {
        "name": "memoryos.audit_commitments",
        "description": "Audit critical architectural invariants, failure lessons, and open handover risks across the memory constellation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "persona": {"type": "string", "enum": ["personal", "enterprise"]},
                "era": {"type": "integer", "default": 2026},
            },
            "required": ["persona"],
        },
    },
    {
        "name": "memoryos.gemma_redact",
        "description": "Run Gemma Edge Privacy Shield to redact PII, emails, phone numbers, and secrets while extracting entities and cognitive traits.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "persona": {"type": "string", "enum": ["personal", "enterprise"]},
            },
            "required": ["content"],
        },
    },
]


def status() -> Dict[str, Any]:
    gemini = bool((os.getenv("GEMINI_API_KEY") or "").strip())
    groq = bool((os.getenv("GROQ_API_KEY") or "").strip())
    vertex_project = (os.getenv("VERTEXAI_PROJECT") or os.getenv("GCLOUD_PROJECT") or "memoryos-cloud-run").strip()
    vertex_location = (os.getenv("VERTEXAI_LOCATION") or "us-central1").strip()
    stack = []
    for item in STACK:
        clone = dict(item)
        if item["id"] in {"gemini", "gemini-omni", "nano-banana", "gemini-live", "ai-studio"}:
            clone["configured"] = gemini or groq
        else:
            clone["configured"] = True
        stack.append(clone)
    return {
        "gemini_configured": gemini,
        "hybrid_router_active": gemini or groq,
        "vertex_project": vertex_project,
        "vertex_location": vertex_location,
        "mcp_ready": True,
        "mcp_tools_count": len(MCP_TOOLS),
        "models_count": sum(1 for s in stack if s.get("category") == "Models"),
        "tools_count": sum(1 for s in stack if s.get("category") == "Tools"),
        "stack": stack,
        "mcp_tools": MCP_TOOLS,
    }

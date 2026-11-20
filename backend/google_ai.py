from __future__ import annotations

import os
from typing import Any, Dict, List


STACK: List[Dict[str, Any]] = [
    {
        "id": "gemini",
        "name": "Gemini",
        "role": "Primary reasoning, retrieval grounding, and long-context synthesis.",
        "tier": "Live",
        "detail": "Free-tier Gemini models power the conversational twin with automatic failover.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
    },
    {
        "id": "gemini-live",
        "name": "Gemini Live",
        "role": "Voice-first presence for the twin.",
        "tier": "UI ready",
        "detail": "Voice capture and spoken playback are built in; Gemini Live can be attached when Vertex access is enabled.",
        "env": ["GEMINI_API_KEY", "VERTEXAI_PROJECT"],
        "live": False,
    },
    {
        "id": "gemma",
        "name": "Gemma",
        "role": "Private, lightweight reasoning for on-prem or edge deployments.",
        "tier": "Vertex ready",
        "detail": "Serve Gemma through Vertex AI when the Google Cloud project and region are configured.",
        "env": ["VERTEXAI_PROJECT", "VERTEXAI_LOCATION"],
        "live": False,
    },
    {
        "id": "vertex-ai",
        "name": "Vertex AI",
        "role": "Enterprise controls, model choice, VPC-SC, audit logs, and regional residency.",
        "tier": "Configurable",
        "detail": "Set VERTEXAI_PROJECT and VERTEXAI_LOCATION to route Gemini/Gemma through your Google Cloud project.",
        "env": ["VERTEXAI_PROJECT", "VERTEXAI_LOCATION"],
        "live": False,
    },
    {
        "id": "ai-studio",
        "name": "Google AI Studio",
        "role": "Prompt lab, experiment history, and model playground.",
        "tier": "Linked",
        "detail": "The Gemini key used here is the same credential family used by Google AI Studio.",
        "env": ["GEMINI_API_KEY"],
        "live": True,
    },
    {
        "id": "agent-skills",
        "name": "Agent Skills / MCP",
        "role": "Expose MemoryOS as a shared memory tool inside assistants.",
        "tier": "Protocol ready",
        "detail": "The platform is model-neutral and designed to sit underneath ChatGPT, Claude, or Copilot-style agents.",
        "env": [],
        "live": True,
    },
]


def status() -> Dict[str, Any]:
    gemini = bool((os.getenv("GEMINI_API_KEY") or "").strip())
    vertex_project = (os.getenv("VERTEXAI_PROJECT") or os.getenv("GCLOUD_PROJECT") or "").strip()
    vertex_location = (os.getenv("VERTEXAI_LOCATION") or "").strip()
    stack = []
    for item in STACK:
        clone = dict(item)
        if item["id"] == "gemini":
            clone["configured"] = gemini
        elif item["id"] in {"gemma", "vertex-ai"}:
            clone["configured"] = bool(vertex_project)
        elif item["id"] == "gemini-live":
            clone["configured"] = gemini and bool(vertex_project)
        else:
            clone["configured"] = gemini
        stack.append(clone)
    return {
        "gemini_configured": gemini,
        "vertex_project": vertex_project,
        "vertex_location": vertex_location,
        "mcp_ready": True,
        "stack": stack,
    }

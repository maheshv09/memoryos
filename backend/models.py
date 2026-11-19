from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PersonaId(str, Enum):
    personal = "personal"
    enterprise = "enterprise"


class MemoryCategory(str, Enum):
    core_values = "Core Values"
    career_decisions = "Career Decisions"
    architecture_systems = "Architecture & Systems"
    relationships = "Relationships"
    failures_lessons = "Failures & Lessons"


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class MemoryItem(BaseModel):
    id: str
    persona: PersonaId
    title: str
    content: str
    category: MemoryCategory
    tags: List[str] = Field(default_factory=list)
    year: int
    emotional_tone: str
    cognitive_traits: List[str] = Field(default_factory=list)
    source_type: str = "text"
    source_connector: Optional[str] = None
    source_label: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    vector: List[float] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    quality_score: float = 1.0
    redacted: bool = False
    version: int = 1
    duplicate_of: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemoryCreateRequest(BaseModel):
    persona: PersonaId
    title: str
    content: str
    category: Optional[MemoryCategory] = None
    tags: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    emotional_tone: Optional[str] = None
    cognitive_traits: List[str] = Field(default_factory=list)
    source_type: str = "text"
    source_connector: Optional[str] = None
    source_label: Optional[str] = None
    entities: List[str] = Field(default_factory=list)
    quality_score: Optional[float] = None
    redacted: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    persona: PersonaId
    messages: List[ChatMessage]
    era: int = 2026
    provider: str = "auto"
    top_k: int = 5
    voice: bool = False


class IngestStageEvent(BaseModel):
    stage: str
    progress: int
    detail: str
    memory_id: Optional[str] = None


class GraphNode(BaseModel):
    id: str
    label: str
    category: MemoryCategory
    year: int
    persona: PersonaId
    tone: str
    score: Optional[float] = None
    active: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ProviderTelemetry(BaseModel):
    provider: str
    model: str
    latency_ms: int
    fallback: bool = False
    rate_limited: bool = False
    local_fallback: bool = False


class MemoryExportResponse(BaseModel):
    version: str = "1.0"
    memories: List[MemoryItem]


class MemoryImportRequest(BaseModel):
    memories: List[MemoryItem]
    replace: bool = False

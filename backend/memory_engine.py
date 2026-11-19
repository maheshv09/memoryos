from __future__ import annotations

import hashlib
import json
import math
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

import numpy as np

from models import GraphEdge, GraphNode, MemoryCategory, MemoryItem, PersonaId


DIM = 1536


def _tokens(text: str) -> List[str]:
    text = (text or "").lower()
    words = re.findall(r"[a-z0-9][a-z0-9\-']{1,}", text)
    grams: List[str] = []
    compact = re.sub(r"\s+", " ", text).strip()
    for n in (3, 4, 5):
        for i in range(max(0, len(compact) - n + 1)):
            grams.append("c:" + compact[i:i + n])
    return words + grams


def vectorize(text: str) -> List[float]:
    vec = np.zeros(DIM, dtype=np.float32)
    for token in _tokens(text):
        idx = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16) % DIM
        vec[idx] += 1.0
    # Light TF-ish weighting by log count.
    vec = np.log1p(vec)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    na = np.linalg.norm(va)
    nb = np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


class MemoryEngine:
    def __init__(self, store_path: Optional[str] = None, seed: bool = True):
        self.store_path = Path(store_path) if store_path else None
        self.memories: Dict[str, MemoryItem] = {}
        loaded = False
        if self.store_path and self.store_path.exists():
            try:
                payload = json.loads(self.store_path.read_text(encoding="utf-8"))
                for raw in payload.get("memories", []):
                    item = MemoryItem.model_validate(raw)
                    if not item.vector:
                        item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
                    self.memories[item.id] = item
                loaded = True
            except Exception:
                loaded = False
        if not loaded and seed:
            self._hydrate_seed()

    def _hydrate_seed(self) -> None:
        try:
            from seed_data import SEED_MEMORIES
        except Exception:
            SEED_MEMORIES = []
        self.memories = {}
        for raw in SEED_MEMORIES:
            item = MemoryItem.model_validate(raw)
            if not item.vector:
                item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
            self.memories[item.id] = item
        self._persist()

    def _persist(self) -> None:
        if not self.store_path:
            return
        try:
            self.store_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {"version": "1.0", "memories": [m.model_dump() for m in self.memories.values()]}
            self.store_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    def list_memories(self, persona: Optional[PersonaId] = None, era: Optional[int] = None, category: Optional[str] = None) -> List[MemoryItem]:
        out = []
        for m in self.memories.values():
            if persona and m.persona != persona:
                continue
            if era is not None and m.year > era:
                continue
            if category and m.category.value != category:
                continue
            out.append(m)
        return sorted(out, key=lambda x: (x.year, x.id), reverse=True)

    def get(self, memory_id: str) -> Optional[MemoryItem]:
        return self.memories.get(memory_id)

    def add_memory(self, item: MemoryItem) -> MemoryItem:
        if not item.vector:
            item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
        self.memories[item.id] = item
        self._log_activity("crystallized", item.id, item.title)
        self._persist()
        return item

    def create_from_request(self, req) -> MemoryItem:
        from connectors import ConnectorManager

        content = ConnectorManager.redact_pii(req.content)
        redacted = content != req.content
        entities = req.entities or ConnectorManager.extract_entities(content)
        year = req.year if req.year is not None else 2026
        category = req.category
        if category is None:
            category = self._infer_category(content, req.persona)
        tone = req.emotional_tone or self._infer_tone(content)
        traits = req.cognitive_traits or self._infer_traits(content)
        duplicate_of = self._find_duplicate(req.persona, content, year)
        quality = req.quality_score if req.quality_score is not None else self._quality_score(content, traits, entities)
        item = MemoryItem(
            id=str(uuid.uuid4()),
            persona=req.persona,
            title=req.title,
            content=content,
            category=category,
            tags=req.tags,
            year=year,
            emotional_tone=tone,
            cognitive_traits=traits,
            source_type=req.source_type,
            source_connector=req.source_connector,
            source_label=req.source_label,
            entities=entities,
            quality_score=quality,
            redacted=redacted,
            duplicate_of=duplicate_of,
            metadata=req.metadata,
        )
        item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
        return self.add_memory(item)

    def _find_duplicate(self, persona: PersonaId, content: str, year: int) -> Optional[str]:
        qv = vectorize(content)
        for m in self.memories.values():
            if m.persona != persona:
                continue
            if m.year != year:
                continue
            if cosine(qv, m.vector) > 0.93:
                return m.id
        return None

    def _quality_score(self, content: str, traits: List[str], entities: List[str]) -> float:
        score = 0.55
        if len(content) > 120:
            score += 0.15
        if len(content) > 300:
            score += 0.1
        score += min(0.15, len(traits) * 0.04)
        score += min(0.1, len(entities) * 0.02)
        return round(min(1.0, score), 3)

    def _infer_category(self, text: str, persona: PersonaId) -> MemoryCategory:
        low = text.lower()
        if any(w in low for w in ["architecture", "system", "database", "latency", "ledger", "api", "microservice", "cache"]):
            return MemoryCategory.architecture_systems
        if any(w in low for w in ["fail", "mistake", "outage", "postmortem", "lesson", "regret"]):
            return MemoryCategory.failures_lessons
        if any(w in low for w in ["career", "job", "promotion", "startup", "offer", "work"]):
            return MemoryCategory.career_decisions
        if any(w in low for w in ["family", "father", "mother", "child", "love", "marriage", "friend"]):
            return MemoryCategory.relationships
        return MemoryCategory.core_values

    def _infer_tone(self, text: str) -> str:
        low = text.lower()
        if any(w in low for w in ["terrified", "fear", "anxiety", "stress"]):
            return "anxious but hopeful"
        if any(w in low for w in ["proud", "joy", "grateful", "love"]):
            return "warm and grateful"
        if any(w in low for w in ["outage", "incident", "risk", "failure"]):
            return "serious and analytical"
        return "reflective and calm"

    def _infer_traits(self, text: str) -> List[str]:
        low = text.lower()
        traits = []
        if any(w in low for w in ["principle", "value", "integrity"]):
            traits.append("principled")
        if any(w in low for w in ["architecture", "system", "design"]):
            traits.append("systems thinking")
        if any(w in low for w in ["family", "love", "care"]):
            traits.append("empathetic")
        if any(w in low for w in ["fail", "lesson", "postmortem"]):
            traits.append("resilient")
        if not traits:
            traits.append("reflective")
        return traits

    def retrieve(self, persona: PersonaId, query: str, era: int = 2026, top_k: int = 5) -> List[tuple[MemoryItem, float]]:
        qv = vectorize(query)
        scored = []
        for m in self.memories.values():
            if m.persona != persona:
                continue
            if m.year > era:
                continue
            score = cosine(qv, m.vector)
            # Slight recency and category boosts are unnecessary; keep pure semantic.
            scored.append((m, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def graph(self, persona: PersonaId, era: int = 2026, active_ids: Optional[Set[str]] = None) -> tuple[List[GraphNode], List[GraphEdge]]:
        active_ids = active_ids or set()
        nodes: List[GraphNode] = []
        mems = [m for m in self.memories.values() if m.persona == persona and m.year <= era]
        mems.sort(key=lambda x: (x.year, x.id))
        for m in mems:
            nodes.append(GraphNode(
                id=m.id,
                label=m.title,
                category=m.category,
                year=m.year,
                persona=m.persona,
                tone=m.emotional_tone,
                active=m.id in active_ids,
            ))
        edges: List[GraphEdge] = []
        # Build nearest-neighbor edges to keep graph readable.
        for i, a in enumerate(mems):
            sims = []
            for j, b in enumerate(mems):
                if i == j:
                    continue
                s = cosine(a.vector, b.vector)
                sims.append((j, s))
            sims.sort(key=lambda x: x[1], reverse=True)
            for j, s in sims[:3]:
                if s >= 0.08:
                    src, dst = sorted([a.id, mems[j].id])
                    if not any(e.source == src and e.target == dst for e in edges):
                        edges.append(GraphEdge(source=src, target=dst, weight=round(s, 4)))
        return nodes, edges

    def export_memories(self, persona: Optional[PersonaId] = None) -> List[MemoryItem]:
        if persona:
            return [m for m in self.memories.values() if m.persona == persona]
        return list(self.memories.values())

    def import_memories(self, items: List[MemoryItem], replace: bool = False) -> int:
        if replace:
            self.memories = {}
        count = 0
        for raw in items:
            item = raw if isinstance(raw, MemoryItem) else MemoryItem.model_validate(raw)
            if not item.vector:
                item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
            self.memories[item.id] = item
            count += 1
        self._persist()
        return count

    def reset(self) -> None:
        self._hydrate_seed()

    def __init__(self, store_path: Optional[str] = None, seed: bool = True):
        self.activity: List[Dict[str, Any]] = []
        super().__init__(store_path=store_path, seed=seed) if False else None
        # Re-run original init logic below by calling a helper.
        self._init_store(store_path, seed)

    def _init_store(self, store_path, seed):
        self.store_path = Path(store_path) if store_path else None
        self.memories: Dict[str, MemoryItem] = {}
        loaded = False
        if self.store_path and self.store_path.exists():
            try:
                payload = json.loads(self.store_path.read_text(encoding="utf-8"))
                for raw in payload.get("memories", []):
                    item = MemoryItem.model_validate(raw)
                    if not item.vector:
                        item.vector = vectorize(item.title + " " + item.content + " " + " ".join(item.tags))
                    self.memories[item.id] = item
                loaded = True
            except Exception:
                loaded = False
        if not loaded and seed:
            self._hydrate_seed()

    def _log_activity(self, action: str, memory_id: Optional[str] = None, title: Optional[str] = None) -> None:
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "action": action,
            "memory_id": memory_id,
            "title": title,
        }
        self.activity.insert(0, event)
        self.activity = self.activity[:60]

    def insights(self, persona: PersonaId, era: int = 2026) -> Dict[str, Any]:
        mems = [m for m in self.memories.values() if m.persona == persona and m.year <= era]
        categories: Dict[str, int] = {}
        traits: Dict[str, int] = {}
        years: Dict[int, int] = {}
        for m in mems:
            categories[m.category.value] = categories.get(m.category.value, 0) + 1
            for t in m.cognitive_traits:
                traits[t] = traits.get(t, 0) + 1
            years[m.year] = years.get(m.year, 0) + 1
        diversity = len(categories)
        health = min(100, 45 + len(mems) * 2 + diversity * 6)
        top_traits = sorted(traits.items(), key=lambda x: x[1], reverse=True)[:6]
        top_memories = sorted(mems, key=lambda m: m.year, reverse=True)[:5]
        return {
            "persona": persona.value,
            "era": era,
            "total": len(mems),
            "categories": categories,
            "top_traits": [{"trait": t, "count": c} for t, c in top_traits],
            "timeline": [{"year": y, "count": years[y]} for y in sorted(years)],
            "health_score": health,
            "latest_memories": [{"id": m.id, "title": m.title, "year": m.year} for m in top_memories],
        }

    def memory_of_the_day(self, persona: PersonaId, era: int = 2026) -> Optional[MemoryItem]:
        mems = [m for m in self.memories.values() if m.persona == persona and m.year <= era]
        if not mems:
            return None
        idx = datetime.utcnow().toordinal() % len(mems)
        return mems[idx]

    def stats(self) -> Dict[str, int]:
        personal = sum(1 for m in self.memories.values() if m.persona == PersonaId.personal)
        enterprise = sum(1 for m in self.memories.values() if m.persona == PersonaId.enterprise)
        return {"total": len(self.memories), "personal": personal, "enterprise": enterprise}

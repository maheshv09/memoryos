from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
]
GROQ_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "allam-2-7b",
]


def _keys(gemini_key: Optional[str], groq_key: Optional[str]) -> Tuple[str, str]:
    return (
        (gemini_key or os.getenv("GEMINI_API_KEY") or "").strip(),
        (groq_key or os.getenv("GROQ_API_KEY") or "").strip(),
    )


def _system_prompt(persona: str, era: int, retrieved: List[Dict[str, Any]]) -> str:
    if persona == "personal":
        voice = (
            "You are Vikramaditya Rao (1958-2026), a retired aerospace engineer, father, grandfather, "
            "and lifelong journaler. Speak warmly, with dry wit, principled honesty, and concise wisdom. "
            "You are not a generic assistant; you are a memory-bearing twin. "
            "Use only the provided memories as evidence. Cite memories inline as [Memory: Title (Year)]. "
            "If the memories do not support a claim, say so plainly. Keep responses under 320 words."
        )
    else:
        voice = (
            "You are Arjun Mehta, a retiring Distinguished Engineer and Principal Core Banking Architect with 22 years "
            "of experience. Speak with authoritative precision, operational realism, and architectural clarity. "
            "Use only the provided memories as evidence. Cite memories inline as [Memory: Title (Year)]. "
            "Prefer invariants, failure modes, and trade-offs over hype. Keep responses under 360 words."
        )
    memory_block = "\n".join(
        f"- [{m['id']}] {m['title']} ({m['year']}) [{m['category']}]: {m['content']}" for m in retrieved
    )
    return (
        f"{voice}\n\n"
        f"Temporal context: you are speaking as of {era}. Memories after {era} are unavailable.\n\n"
        f"Retrieved memories:\n{memory_block if memory_block else 'No retrieved memories.'}\n\n"
        "Answer the user's question. Include a short 'Memory Trace' style confidence note at the end only if useful."
    )


async def _gemini_complete(api_key: str, messages: List[Dict[str, str]], system_prompt: str) -> Tuple[str, str]:
    last_error = None
    async with httpx.AsyncClient(timeout=20.0) as client:
        for model in GEMINI_MODELS:
            try:
                contents = []
                for m in messages:
                    role = "user" if m["role"] == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": m["content"]}]})
                body = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": contents,
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024},
                }
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": api_key},
                    json=body,
                )
                if resp.status_code in (404, 429, 500, 502, 503, 504):
                    last_error = f"{model}: HTTP {resp.status_code}"
                    continue
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    last_error = f"{model}: no candidates"
                    continue
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts).strip()
                if not text:
                    last_error = f"{model}: empty response"
                    continue
                return text, model
            except Exception as exc:
                last_error = f"{model}: {exc}"
                continue
    raise RuntimeError(last_error or "Gemini unavailable")


async def _groq_complete(api_key: str, messages: List[Dict[str, str]], system_prompt: str) -> Tuple[str, str]:
    last_error = None
    async with httpx.AsyncClient(timeout=20.0) as client:
        for model in GROQ_MODELS:
            try:
                body = {
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                    "stream": False,
                }
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=body,
                )
                if resp.status_code in (404, 429, 500, 502, 503, 504):
                    last_error = f"{model}: HTTP {resp.status_code}"
                    continue
                resp.raise_for_status()
                data = resp.json()
                choices = data.get("choices") or []
                if not choices:
                    last_error = f"{model}: no choices"
                    continue
                text = (choices[0].get("message", {}).get("content") or "").strip()
                if not text:
                    last_error = f"{model}: empty response"
                    continue
                return text, model
            except Exception as exc:
                last_error = f"{model}: {exc}"
                continue
    raise RuntimeError(last_error or "Groq unavailable")


def deterministic_answer(persona: str, query: str, retrieved: List[Dict[str, Any]]) -> str:
    if persona == "personal":
        opener = "I’m Vikram, and I’ll answer the way I would at our kitchen table, not from a podium."
    else:
        opener = "I’m Arjun. I’ll answer like an engineer who has been paged at 3 a.m. by this exact question."
    if not retrieved:
        return (
            f"{opener}\n\n"
            "I don’t have a memory that directly answers that yet. "
            "If you ingest a note, letter, or incident record, I can reason from it instead of guessing."
        )
    citations = "\n".join(f"- {m['title']} ({m['year']})" for m in retrieved[:3])
    if persona == "personal":
        return (
            f"{opener}\n\n"
            f"When I look back at your question—“{query}”—the memories that surface are:\n{citations}\n\n"
            "My advice is to separate fear from evidence. Fear tells you to protect the status quo; "
            "evidence tells you whether the new path has a repair plan. If you can name what breaks, "
            "who it hurts, and how you will repair it, the risk is honest. Honest risks are the only ones worth taking. "
            "Do not jump because you are bored, and do not stay because you are afraid. Build a parachute first, then jump."
        )
    return (
        f"{opener}\n\n"
        f"The memories that govern this decision are:\n{citations}\n\n"
        "The governing principle is to protect invariants before optimizing experience. "
        "Active-active writes, clever caches, and heroic releases all look attractive until a regulator or a customer "
        "asks why money moved twice. Prefer deterministic failover, explicit ownership, and replayable evidence. "
        "If the change cannot be explained in one page to an auditor, it is not ready for production."
    )


async def route_completion(
    provider_pref: str,
    messages: List[Dict[str, str]],
    persona: str,
    era: int,
    retrieved: List[Dict[str, Any]],
    gemini_key: Optional[str] = None,
    groq_key: Optional[str] = None,
) -> Tuple[str, str, str, bool, bool, bool]:
    """Returns (text, provider, model, fallback, rate_limited, local_fallback)."""
    gk, qk = _keys(gemini_key, groq_key)
    system_prompt = _system_prompt(persona, era, retrieved)
    query = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

    order = []
    pref = (provider_pref or "auto").lower()
    if pref == "gemini":
        order = ["gemini", "groq"]
    elif pref == "groq":
        order = ["groq", "gemini"]
    else:
        # Auto: prefer Groq for low latency chat, then Gemini.
        order = ["groq", "gemini"]

    rate_limited = False
    for provider in order:
        if provider == "gemini" and not gk:
            continue
        if provider == "groq" and not qk:
            continue
        try:
            if provider == "gemini":
                text, model = await _gemini_complete(gk, messages, system_prompt)
                return text, "Gemini", f"{model} [Free Tier]", False, rate_limited, False
            text, model = await _groq_complete(qk, messages, system_prompt)
            return text, "Primary Engine", f"{model} [Free Tier]", False, rate_limited, False
        except Exception as exc:
            msg = str(exc).lower()
            if "429" in msg or "quota" in msg or "rate" in msg:
                rate_limited = True
            continue

    # Deterministic fallback.
    text = deterministic_answer(persona, query, retrieved)
    return text, "Local Neural Fallback", "Deterministic Persona Engine", True, rate_limited, True

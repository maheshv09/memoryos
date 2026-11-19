from __future__ import annotations

import base64
import csv
import io
import json
import mailbox
import os
import re
import secrets
import tempfile
import time
from datetime import datetime
from email import policy
from email.parser import BytesParser
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode
from xml.etree import ElementTree as ET

import httpx

from connector_providers import PROVIDER_SYNC
from memory_engine import MemoryEngine
from models import MemoryCreateRequest, PersonaId

TOKEN_STORE = Path(os.getenv("CONNECTOR_TOKEN_STORE", Path(__file__).resolve().parent / "data" / "connector_tokens.json"))


CONNECTOR_DEFINITIONS: List[Dict[str, Any]] = [
    {"id": "gmail", "name": "Gmail", "category": "Communication", "auth": "oauth2", "icon": "mail", "description": "Email threads, approvals, decisions, and stakeholder context.", "scopes": ["gmail.readonly"], "env_vars": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "docs_url": "https://developers.google.com/gmail/api", "supports_upload": True},
    {"id": "google_drive", "name": "Google Drive", "category": "Documents", "auth": "oauth2", "icon": "folder", "description": "Docs, sheets, and shared drive knowledge.", "scopes": ["drive.readonly"], "env_vars": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "docs_url": "https://developers.google.com/drive/api", "supports_upload": True},
    {"id": "notion", "name": "Notion", "category": "Knowledge Base", "auth": "oauth2", "icon": "book", "description": "Wikis, meeting notes, and team documentation.", "scopes": ["read_content"], "env_vars": ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"], "docs_url": "https://developers.notion.com/docs/authorization", "supports_upload": True},
    {"id": "slack", "name": "Slack", "category": "Communication", "auth": "oauth2", "icon": "message", "description": "Incident channels, decisions, and informal context.", "scopes": ["channels:history", "channels:read", "groups:history", "groups:read"], "env_vars": ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"], "docs_url": "https://api.slack.com/authentication/oauth-v2", "supports_upload": True},
    {"id": "whatsapp", "name": "WhatsApp Export", "category": "Personal", "auth": "export", "icon": "phone", "description": "Family chats and personal voice-note transcripts from WhatsApp exports.", "scopes": [], "env_vars": [], "docs_url": "https://faq.whatsapp.com/1180414079177245", "supports_upload": True},
    {"id": "zoom", "name": "Zoom", "category": "Meetings", "auth": "oauth2", "icon": "video", "description": "Meeting transcripts and action items.", "scopes": ["recording:read"], "env_vars": ["ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"], "docs_url": "https://developers.zoom.us/docs/api/", "supports_upload": True},
    {"id": "teams", "name": "Microsoft Teams", "category": "Meetings", "auth": "oauth2", "icon": "users", "description": "Enterprise chat and meeting summaries via Microsoft Graph.", "scopes": ["Chat.Read", "User.Read", "offline_access"], "env_vars": ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], "docs_url": "https://learn.microsoft.com/graph/", "supports_upload": True},
    {"id": "jira", "name": "Jira", "category": "Engineering", "auth": "oauth2", "icon": "kanban", "description": "Issues, post-mortems, and delivery history.", "scopes": ["read:jira-work", "read:jira-user", "offline_access"], "env_vars": ["ATLASSIAN_CLIENT_ID", "ATLASSIAN_CLIENT_SECRET"], "docs_url": "https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/", "supports_upload": True},
    {"id": "github", "name": "GitHub", "category": "Engineering", "auth": "oauth2", "icon": "git", "description": "PRs, reviews, ADRs, and code discussions.", "scopes": ["repo", "read:user"], "env_vars": ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], "docs_url": "https://docs.github.com/apps/oauth-apps", "supports_upload": True},
    {"id": "obsidian", "name": "Obsidian Vault", "category": "Personal", "auth": "export", "icon": "notebook", "description": "Markdown notes and personal knowledge graphs.", "scopes": [], "env_vars": [], "docs_url": "https://help.obsidian.md/", "supports_upload": True},
    {"id": "apple_notes", "name": "Apple Notes", "category": "Personal", "auth": "export", "icon": "sticky", "description": "Personal notes and reflections exported from Apple Notes.", "scopes": [], "env_vars": [], "docs_url": "https://support.apple.com/guide/notes/", "supports_upload": True},
    {"id": "voice_memos", "name": "Voice Memos", "category": "Personal", "auth": "device", "icon": "mic", "description": "Audio transcripts and spoken reflections, transcribed on import.", "scopes": [], "env_vars": [], "docs_url": "https://platform.openai.com/docs/guides/speech-to-text", "supports_upload": True},
    {"id": "web_article", "name": "Web Article", "category": "Universal", "auth": "url", "icon": "globe", "description": "Any public article, essay, or page fetched by URL — no account or API key.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False},
    {"id": "rss_feed", "name": "RSS / Atom", "category": "Knowledge Base", "auth": "url", "icon": "rss", "description": "Substack, blogs, research feeds, and news — fetched directly by feed URL.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False},
    {"id": "calendar", "name": "Calendar (.ics)", "category": "Personal", "auth": "export", "icon": "calendar", "description": "Events, commitments, and recurring rituals from an iCalendar export.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True},
    {"id": "bookmarks", "name": "Browser Bookmarks", "category": "Personal", "auth": "export", "icon": "bookmark", "description": "Saved reading and research trails from a browser bookmarks HTML export.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True},
    {"id": "kindle", "name": "Kindle Highlights", "category": "Personal", "auth": "export", "icon": "book", "description": "Highlights and notes from Kindle's My Clippings.txt file.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True},
    {"id": "file_import", "name": "Files & Exports", "category": "Universal", "auth": "export", "icon": "upload", "description": "Universal .txt, .md, .json, .csv, .eml, .mbox, .ics, .html, and .vtt imports.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True},
    {"id": "manual", "name": "Manual Memory", "category": "Universal", "auth": "none", "icon": "pen", "description": "Directly authored memories and reflections.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False},
]


OAUTH_CONFIG: Dict[str, Dict[str, Any]] = {
    "gmail": {"authorize": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token", "client_id": "GOOGLE_CLIENT_ID", "client_secret": "GOOGLE_CLIENT_SECRET", "scopes": ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/drive.readonly"], "basic": False, "extra": {"access_type": "offline", "prompt": "consent"}},
    "google_drive": {"authorize": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token", "client_id": "GOOGLE_CLIENT_ID", "client_secret": "GOOGLE_CLIENT_SECRET", "scopes": ["https://www.googleapis.com/auth/drive.readonly"], "basic": False, "extra": {"access_type": "offline", "prompt": "consent"}},
    "notion": {"authorize": "https://api.notion.com/v1/oauth/authorize", "token": "https://api.notion.com/v1/oauth/token", "client_id": "NOTION_CLIENT_ID", "client_secret": "NOTION_CLIENT_SECRET", "scopes": [], "basic": True, "extra": {"owner": "user"}},
    "slack": {"authorize": "https://slack.com/oauth/v2/authorize", "token": "https://slack.com/api/oauth.v2.access", "client_id": "SLACK_CLIENT_ID", "client_secret": "SLACK_CLIENT_SECRET", "scopes": ["channels:history", "channels:read", "groups:history", "groups:read"], "basic": True, "extra": {}},
    "zoom": {"authorize": "https://zoom.us/oauth/authorize", "token": "https://zoom.us/oauth/token", "client_id": "ZOOM_CLIENT_ID", "client_secret": "ZOOM_CLIENT_SECRET", "scopes": ["recording:read"], "basic": True, "extra": {}},
    "teams": {"authorize": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token", "client_id": "MICROSOFT_CLIENT_ID", "client_secret": "MICROSOFT_CLIENT_SECRET", "scopes": ["Chat.Read", "User.Read", "offline_access"], "basic": False, "extra": {}},
    "jira": {"authorize": "https://auth.atlassian.com/authorize", "token": "https://auth.atlassian.com/oauth/token", "client_id": "ATLASSIAN_CLIENT_ID", "client_secret": "ATLASSIAN_CLIENT_SECRET", "scopes": ["read:jira-work", "read:jira-user", "offline_access"], "basic": False, "extra": {"audience": "api.atlassian.com", "prompt": "consent"}},
    "github": {"authorize": "https://github.com/login/oauth/authorize", "token": "https://github.com/login/oauth/access_token", "client_id": "GITHUB_CLIENT_ID", "client_secret": "GITHUB_CLIENT_SECRET", "scopes": ["repo", "read:user"], "basic": False, "extra": {}},
}


class ConnectorManager:
    def __init__(self, engine: MemoryEngine):
        self.engine = engine
        self.state: Dict[str, Dict[str, Any]] = {}
        self.logs: Dict[str, List[Dict[str, Any]]] = {c["id"]: [] for c in CONNECTOR_DEFINITIONS}
        self.pending_states: Dict[str, str] = {}
        self._load_tokens()
        for c in CONNECTOR_DEFINITIONS:
            saved = self.state.get(c["id"], {})
            local_ready = c["auth"] in ("export", "device", "none", "url")
            if "connected" in saved:
                connected = bool(saved.get("connected"))
            else:
                connected = bool(saved.get("access_token")) or local_ready
            self.state[c["id"]] = {
                "connected": connected,
                "access_token": saved.get("access_token"),
                "refresh_token": saved.get("refresh_token"),
                "expires_at": saved.get("expires_at"),
                "last_sync": saved.get("last_sync"),
                "status": saved.get("status") or ("ready" if connected else ("export" if c["auth"] == "export" else "needs_auth")),
                "last_error": saved.get("last_error"),
            }

    def _load_tokens(self) -> None:
        try:
            if TOKEN_STORE.exists():
                self.state = json.loads(TOKEN_STORE.read_text(encoding="utf-8"))
        except Exception:
            self.state = {}

    def _save_tokens(self) -> None:
        try:
            TOKEN_STORE.parent.mkdir(parents=True, exist_ok=True)
            TOKEN_STORE.write_text(json.dumps(self.state, indent=2), encoding="utf-8")
            try:
                TOKEN_STORE.chmod(0o600)
            except Exception:
                pass
        except Exception:
            pass

    def list_connectors(self) -> List[Dict[str, Any]]:
        out = []
        for c in CONNECTOR_DEFINITIONS:
            s = self.state[c["id"]]
            config = OAUTH_CONFIG.get(c["id"])
            configured = bool(config and os.getenv(config["client_id"]) and os.getenv(config["client_secret"]))
            out.append({
                **c,
                "connected": s["connected"],
                "last_sync": s.get("last_sync"),
                "status": s.get("status"),
                "last_error": s.get("last_error"),
                "configured": configured or c["auth"] in ("export", "device", "none", "url"),
            })
        return out

    def _log(self, connector_id: str, action: str, detail: str) -> None:
        self.logs.setdefault(connector_id, []).insert(0, {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "action": action,
            "detail": detail,
        })
        self.logs[connector_id] = self.logs[connector_id][:60]

    def get_logs(self, connector_id: str) -> List[Dict[str, Any]]:
        return self.logs.get(connector_id, [])

    def authorization_url(self, connector_id: str, redirect_uri: str) -> Dict[str, Any]:
        config = OAUTH_CONFIG.get(connector_id)
        if not config:
            raise ValueError("This connector uses export import, not OAuth.")
        client_id = os.getenv(config["client_id"])
        client_secret = os.getenv(config["client_secret"])
        if not client_id or not client_secret:
            return {
                "requires_config": True,
                "env_vars": [config["client_id"], config["client_secret"]],
                "docs_url": next((c["docs_url"] for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), ""),
            }
        state = secrets.token_urlsafe(24)
        self.pending_states[state] = connector_id
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": " ".join(config["scopes"]),
            **config.get("extra", {}),
        }
        return {"auth_url": f"{config['authorize']}?{urlencode(params)}", "state": state}

    async def exchange_code(self, connector_id: str, code: str, redirect_uri: str, state: Optional[str]) -> Dict[str, Any]:
        if state and self.pending_states.get(state) != connector_id:
            raise ValueError("Invalid OAuth state")
        config = OAUTH_CONFIG[connector_id]
        client_id = os.getenv(config["client_id"], "")
        client_secret = os.getenv(config["client_secret"], "")
        data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        headers = {"Accept": "application/json"}
        auth = None
        if config["basic"]:
            auth = (client_id, client_secret)
        else:
            data["client_id"] = client_id
            data["client_secret"] = client_secret
        async with httpx.AsyncClient(timeout=30) as c:
            if connector_id == "notion":
                resp = await c.post(config["token"], auth=auth, json=data)
            else:
                resp = await c.post(config["token"], data=data, auth=auth, headers=headers)
            resp.raise_for_status()
            payload = resp.json()
        token = payload.get("authed_user", {}).get("access_token") or payload.get("access_token")
        if not token:
            raise ValueError("Provider did not return an access token")
        self.state[connector_id].update({
            "connected": True,
            "access_token": token,
            "refresh_token": payload.get("refresh_token"),
            "expires_at": time.time() + int(payload.get("expires_in", 3600)) if payload.get("expires_in") else None,
            "status": "connected",
            "last_error": None,
        })
        self._save_tokens()
        self._log(connector_id, "connected", "OAuth authorization completed.")
        return {"connected": True, "connector": connector_id}

    def connect_local(self, connector_id: str) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        if definition["auth"] == "oauth2":
            raise ValueError("OAuth connector must use the authorization URL.")
        self.state[connector_id].update({"connected": True, "status": "connected", "last_error": None})
        self._save_tokens()
        self._log(connector_id, "connected", "Local source enabled.")
        return {"connected": True, "connector": connector_id}

    def disconnect(self, connector_id: str) -> Dict[str, Any]:
        if connector_id not in self.state:
            raise ValueError("Unknown connector")
        self.state[connector_id].update({"connected": False, "access_token": None, "refresh_token": None, "expires_at": None, "status": "disconnected"})
        self._save_tokens()
        self._log(connector_id, "disconnected", "Connector removed.")
        return {"connected": False, "connector": connector_id}

    async def _valid_token(self, connector_id: str) -> str:
        s = self.state[connector_id]
        token = s.get("access_token")
        if not token:
            raise ValueError("Connector is not connected.")
        expires = s.get("expires_at")
        if expires and time.time() > expires - 60 and s.get("refresh_token"):
            config = OAUTH_CONFIG.get(connector_id)
            if config:
                data = {"grant_type": "refresh_token", "refresh_token": s["refresh_token"]}
                client_id = os.getenv(config["client_id"], "")
                client_secret = os.getenv(config["client_secret"], "")
                auth = (client_id, client_secret) if config["basic"] else None
                if not config["basic"]:
                    data.update({"client_id": client_id, "client_secret": client_secret})
                async with httpx.AsyncClient(timeout=30) as c:
                    resp = await c.post(config["token"], data=data, auth=auth, headers={"Accept": "application/json"})
                    if resp.status_code == 200:
                        payload = resp.json()
                        token = payload.get("access_token", token)
                        s["access_token"] = token
                        if payload.get("refresh_token"):
                            s["refresh_token"] = payload["refresh_token"]
                        s["expires_at"] = time.time() + int(payload.get("expires_in", 3600))
                        self._save_tokens()
        return token

    async def sync(self, connector_id: str, persona: PersonaId, era: int = 2026) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        if connector_id in PROVIDER_SYNC:
            token = await self._valid_token(connector_id)
            try:
                docs = await PROVIDER_SYNC[connector_id](token)
            except Exception as exc:
                self.state[connector_id]["status"] = "error"
                self.state[connector_id]["last_error"] = str(exc)
                self._log(connector_id, "error", str(exc)[:300])
                raise
        else:
            raise ValueError("This source uses file/export import. Upload a file to ingest it.")
        created = []
        for d in docs[:30]:
            req = MemoryCreateRequest(
                persona=persona,
                title=d["title"][:180],
                content=d["content"],
                tags=[connector_id, "connector-sync"],
                year=d.get("year", era),
                source_type=d.get("source_type", connector_id),
                source_connector=connector_id,
                source_label=d.get("source_label"),
                metadata={"connector": connector_id, "sync": "oauth"},
            )
            item = self.engine.create_from_request(req)
            created.append(item.id)
        self.state[connector_id].update({"last_sync": datetime.utcnow().isoformat() + "Z", "status": "synced", "last_error": None})
        self._save_tokens()
        self._log(connector_id, "synced", f"Ingested {len(created)} real memories from {definition['name']}.")
        return {"connector": connector_id, "ingested": len(created), "memory_ids": created, "source": definition["name"]}

    async def fetch_source(self, connector_id: str, url: str, persona: PersonaId, era: int = 2026) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        if connector_id not in ("web_article", "rss_feed"):
            raise ValueError("This source does not use URL ingestion.")
        if not url.startswith(("http://", "https://")):
            raise ValueError("Enter a full http(s) URL.")
        async with httpx.AsyncClient(
            timeout=25,
            follow_redirects=True,
            headers={"User-Agent": "MemoryOS/1.0 (+https://memoryos.local)"},
        ) as c:
            resp = await c.get(url)
            resp.raise_for_status()
        if connector_id == "web_article":
            title, content = _extract_article(resp.text, url)
            docs = [{
                "title": title,
                "content": content,
                "year": era,
                "source_type": "web_article",
                "source_label": url,
            }]
        else:
            docs = _parse_feed(resp.text, url, era)
        docs = [d for d in docs if d.get("content", "").strip()]
        if not docs:
            raise ValueError("No readable content found at that URL.")
        created = []
        for d in docs[:12]:
            req = MemoryCreateRequest(
                persona=persona,
                title=d["title"][:180],
                content=d["content"],
                tags=[connector_id, "url-import"],
                year=d.get("year", era),
                source_type=d.get("source_type", connector_id),
                source_connector=connector_id,
                source_label=d.get("source_label", url),
                metadata={"connector": connector_id, "url": url, "link": d.get("link", url)},
            )
            item = self.engine.create_from_request(req)
            created.append(item.id)
        self.state[connector_id].update({
            "last_sync": datetime.utcnow().isoformat() + "Z",
            "status": "ready",
            "last_error": None,
        })
        self._save_tokens()
        self._log(connector_id, "fetched", f"Ingested {len(created)} items from {url}.")
        return {
            "connector": connector_id,
            "ingested": len(created),
            "memory_ids": created,
            "source": definition["name"],
            "url": url,
        }

    async def import_file(self, connector_id: str, filename: str, data: bytes, persona: PersonaId, year: Optional[int] = None) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        docs = parse_export(connector_id, filename, data, year)
        created = []
        for d in docs:
            req = MemoryCreateRequest(
                persona=persona,
                title=d["title"][:180],
                content=d["content"],
                tags=[connector_id, "imported"],
                year=d.get("year", year or datetime.utcnow().year),
                source_type=d.get("source_type", connector_id),
                source_connector=connector_id,
                source_label=d.get("source_label", filename),
                metadata={"connector": connector_id, "filename": filename},
            )
            item = self.engine.create_from_request(req)
            created.append(item.id)
        self.state[connector_id]["last_sync"] = datetime.utcnow().isoformat() + "Z"
        self._save_tokens()
        self._log(connector_id, "imported", f"Ingested {len(created)} documents from {filename}.")
        return {"connector": connector_id, "ingested": len(created), "memory_ids": created, "documents": len(docs)}

    @staticmethod
    def redact_pii(text: str) -> str:
        text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", text)
        text = re.sub(r"\+?\d[\d\s\-]{8,}\d", "[REDACTED_PHONE]", text)
        return text

    @staticmethod
    def extract_entities(text: str) -> List[str]:
        entities = set(re.findall(r"\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*\b", text))
        for term in ["ISO-20022", "Redis", "Kafka", "Oracle", "PostgreSQL", "Slack", "Jira", "GitHub", "Notion"]:
            if term.lower() in text.lower():
                entities.add(term)
        return sorted(entities)[:12]

    async def transcribe_audio(self, filename: str, data: bytes) -> str:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Audio transcription is not configured on the server.")
        files = {"file": (filename, data, "application/octet-stream")}
        data_form = {"model": "whisper-large-v3-turbo", "response_format": "json"}
        async with httpx.AsyncClient(timeout=120) as c:
            resp = await c.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                data=data_form,
                files=files,
            )
            resp.raise_for_status()
            return resp.json().get("text", "")


def parse_export(connector_id: str, filename: str, data: bytes, year: Optional[int] = None) -> List[Dict[str, Any]]:
    text = data.decode("utf-8", errors="ignore")
    lower = filename.lower()
    now_year = year or datetime.utcnow().year

    if connector_id == "whatsapp" or "whatsapp" in lower:
        lines = [l for l in text.splitlines() if re.match(r"^\[?\d{1,4}[./-]\d{1,2}[./-]\d{1,4}", l.strip())]
        content = "\n".join(lines[:1200]) or text[:20000]
        return [{"title": "WhatsApp family chat", "content": content, "year": now_year, "source_type": "whatsapp", "source_label": filename}]

    if connector_id == "slack" or lower.endswith(".json") and "slack" in lower:
        try:
            payload = json.loads(text)
            docs = []
            if isinstance(payload, list):
                for item in payload[:40]:
                    if isinstance(item, dict) and item.get("text"):
                        docs.append({"title": item.get("user", "Slack message"), "content": item.get("text", ""), "year": now_year, "source_type": "slack", "source_label": filename})
            elif isinstance(payload, dict):
                for ch in payload.get("channels", [])[:20]:
                    msgs = [m.get("text", "") for m in ch.get("messages", []) if m.get("text")]
                    if msgs:
                        docs.append({"title": f"Slack #{ch.get('name', 'channel')}", "content": "\n".join(msgs)[:20000], "year": now_year, "source_type": "slack", "source_label": filename})
            if docs:
                return docs
        except Exception:
            pass

    if lower.endswith(".eml"):
        msg = BytesParser(policy=policy.default).parsebytes(data)
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body += part.get_content()
        else:
            body = msg.get_content()
        return [{"title": msg.get("subject", "Email"), "content": body[:20000], "year": _year_from_text(msg.get("date", "")) or now_year, "source_type": "gmail", "source_label": filename}]

    if lower.endswith(".vtt") or connector_id == "zoom":
        lines = [l for l in text.splitlines() if l.strip() and not l.startswith("WEBVTT") and "-->" not in l and not l.strip().isdigit()]
        return [{"title": filename.replace(".vtt", ""), "content": "\n".join(lines)[:20000], "year": now_year, "source_type": "zoom", "source_label": filename}]

    if connector_id == "calendar" or lower.endswith(".ics"):
        docs = _parse_ics(text, filename, now_year)
        if docs:
            return docs

    if connector_id == "bookmarks" or (lower.endswith(".html") and "bookmark" in lower):
        docs = _parse_bookmarks(text, filename, now_year)
        if docs:
            return docs

    if connector_id == "kindle" or "clipping" in lower:
        docs = _parse_kindle(text, filename, now_year)
        if docs:
            return docs

    if lower.endswith(".mbox"):
        docs = _parse_mbox(data, filename, now_year)
        if docs:
            return docs

    if connector_id == "file_import" and lower.endswith(".json"):
        try:
            payload = json.loads(text)
            memories = payload.get("memories", payload) if isinstance(payload, dict) else payload
            if isinstance(memories, list):
                docs = []
                for m in memories[:80]:
                    if isinstance(m, dict) and m.get("content"):
                        docs.append({"title": m.get("title", "Imported memory"), "content": m.get("content", ""), "year": int(m.get("year", now_year)), "source_type": m.get("source_type", "json"), "source_label": filename})
                if docs:
                    return docs
        except Exception:
            pass

    if lower.endswith(".csv"):
        rows = list(csv.DictReader(io.StringIO(text)))
        docs = []
        for row in rows[:80]:
            content = " | ".join(f"{k}: {v}" for k, v in row.items() if v)
            if content:
                docs.append({"title": next(iter(row.values()), filename), "content": content, "year": now_year, "source_type": "csv", "source_label": filename})
        if docs:
            return docs

    # Markdown, text, Obsidian, Apple Notes, universal fallback.
    title = re.sub(r"\.(md|markdown|txt|html|rtf)$", "", filename, flags=re.I)
    first_heading = re.search(r"^#\s+(.+)$", text, re.M)
    if first_heading:
        title = first_heading.group(1)
    clean = re.sub(r"<[^>]+>", " ", text)
    return [{"title": title or "Imported memory", "content": clean[:20000], "year": now_year, "source_type": connector_id, "source_label": filename}]


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: List[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        if tag in ("script", "style", "noscript", "svg"):
            self.skip += 1
        if tag in ("p", "br", "div", "h1", "h2", "h3", "h4", "li", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript", "svg") and self.skip:
            self.skip -= 1
        if tag in ("p", "div", "h1", "h2", "h3", "h4", "li", "tr"):
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip:
            self.parts.append(data)

    def text(self) -> str:
        raw = "".join(self.parts)
        return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", raw)).strip()


def _strip_html(value: str) -> str:
    try:
        parser = _TextExtractor()
        parser.feed(value or "")
        return parser.text()
    except Exception:
        return re.sub(r"<[^>]+>", " ", value or "").strip()


def _extract_article(html: str, url: str) -> Tuple[str, str]:
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html or "", re.I | re.S)
    title = unescape(_strip_html(title_match.group(1))).strip() if title_match else ""
    content = _strip_html(html or "")
    return (title or "Web article")[:180], content[:20000]


def _parse_feed(xml_text: str, url: str, era: int) -> List[Dict[str, Any]]:
    try:
        root = ET.fromstring(xml_text)
    except Exception:
        return []
    docs: List[Dict[str, Any]] = []
    items = root.findall(".//item")
    if items:
        for item in items[:12]:
            title = (item.findtext("title") or "Feed item").strip()
            description = item.findtext("description") or ""
            if not description:
                for child in item:
                    if child.tag.endswith("encoded"):
                        description = child.text or ""
                        break
            link = (item.findtext("link") or url).strip()
            published = item.findtext("pubDate") or ""
            content = _strip_html(description)
            if content:
                docs.append({
                    "title": title,
                    "content": content[:20000],
                    "year": _year_from_text(published) or era,
                    "source_type": "rss_feed",
                    "source_label": link,
                    "link": link,
                })
        return docs
    ns = {"a": "http://www.w3.org/2005/Atom"}
    for entry in root.findall(".//a:entry", ns)[:12]:
        title = (entry.findtext("a:title", default="Feed item", namespaces=ns) or "Feed item").strip()
        summary = entry.findtext("a:summary", default="", namespaces=ns) or entry.findtext("a:content", default="", namespaces=ns)
        link_el = entry.find("a:link", ns)
        link = link_el.get("href") if link_el is not None else url
        updated = entry.findtext("a:updated", default="", namespaces=ns)
        content = _strip_html(summary)
        if content:
            docs.append({
                "title": title,
                "content": content[:20000],
                "year": _year_from_text(updated) or era,
                "source_type": "rss_feed",
                "source_label": link or url,
                "link": link or url,
            })
    return docs


def _parse_ics(text: str, filename: str, now_year: int) -> List[Dict[str, Any]]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"\n[ \t]", "", normalized)
    events = re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", normalized, re.S | re.I)
    docs: List[Dict[str, Any]] = []
    for event in events[:80]:
        def field(name: str) -> str:
            match = re.search(rf"^{name}(?:;[^:]*)?:(.*)$", event, re.M | re.I)
            return unescape(match.group(1).strip()) if match else ""

        summary = field("SUMMARY") or "Calendar event"
        start = field("DTSTART")
        end = field("DTEND")
        location = field("LOCATION")
        description = field("DESCRIPTION").replace("\\n", "\n").replace("\\,", ",")
        when = f"When: {start}" + (f" → {end}" if end else "")
        content = "\n".join(part for part in [summary, when, f"Where: {location}" if location else "", description] if part)
        docs.append({
            "title": summary[:180],
            "content": content[:20000],
            "year": _year_from_text(start) or now_year,
            "source_type": "calendar",
            "source_label": filename,
        })
    return docs


def _parse_bookmarks(text: str, filename: str, now_year: int) -> List[Dict[str, Any]]:
    links = re.findall(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", text or "", re.I | re.S)
    docs: List[Dict[str, Any]] = []
    for href, label in links[:80]:
        title = _strip_html(label).strip() or href
        docs.append({
            "title": title[:180],
            "content": f"Bookmarked: {title}\nURL: {href}"[:20000],
            "year": now_year,
            "source_type": "bookmarks",
            "source_label": filename,
        })
    return docs


def _parse_kindle(text: str, filename: str, now_year: int) -> List[Dict[str, Any]]:
    entries = re.split(r"\n\s*={5,}\s*\n", text or "")
    books: Dict[str, List[Tuple[str, str]]] = {}
    for entry in entries:
        lines = [line.strip() for line in entry.splitlines() if line.strip()]
        if len(lines) >= 3:
            book = lines[0]
            meta = lines[1]
            quote = "\n".join(lines[2:])
            if quote:
                books.setdefault(book, []).append((meta, quote))
    docs: List[Dict[str, Any]] = []
    for book, highlights in books.items():
        content = "\n\n".join(f"[{meta}] {quote}" for meta, quote in highlights[:80])
        docs.append({
            "title": f"Kindle highlights — {book}"[:180],
            "content": content[:20000],
            "year": now_year,
            "source_type": "kindle",
            "source_label": filename,
        })
    return docs


def _parse_mbox(data: bytes, filename: str, now_year: int) -> List[Dict[str, Any]]:
    path = None
    docs: List[Dict[str, Any]] = []
    try:
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            handle.write(data)
            path = handle.name
        box = mailbox.mbox(path)
        for message in list(box)[:50]:
            subject = str(message.get("subject", "Email"))
            date = str(message.get("date", ""))
            body = ""
            if message.is_multipart():
                for part in message.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body += payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
            else:
                payload = message.get_payload(decode=True)
                body = payload.decode(message.get_content_charset() or "utf-8", errors="ignore") if payload else str(message.get_payload())
            if body.strip():
                docs.append({
                    "title": subject[:180],
                    "content": body[:20000],
                    "year": _year_from_text(date) or now_year,
                    "source_type": "email_archive",
                    "source_label": filename,
                })
    except Exception:
        return []
    finally:
        if path:
            try:
                os.unlink(path)
            except Exception:
                pass
    return docs


def _year_from_text(value: str) -> Optional[int]:
    m = re.search(r"(19|20)\d{2}", value)
    return int(m.group(0)) if m else None

from __future__ import annotations

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
    {"id": "gmail", "name": "Gmail", "category": "Communication", "auth": "oauth2", "icon": "mail", "description": "Email threads, executive approvals, family letters, and stakeholder decisions.", "scopes": ["gmail.readonly"], "env_vars": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "docs_url": "https://developers.google.com/gmail/api", "supports_upload": True, "sample_hint": "Paste an email thread or .eml/.mbox export"},
    {"id": "google_drive", "name": "Google Drive & Docs", "category": "Documents", "auth": "oauth2", "icon": "folder", "description": "Google Docs, architecture RFCs, design memos, and shared drive folders.", "scopes": ["drive.readonly"], "env_vars": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "docs_url": "https://developers.google.com/drive/api", "supports_upload": True, "sample_hint": "Paste a Google Doc memo or upload markdown/txt"},
    {"id": "whatsapp", "name": "WhatsApp Chats", "category": "Personal", "auth": "export", "icon": "phone", "description": "Family chats, founder threads, and personal voice-note transcripts from WhatsApp.", "scopes": [], "env_vars": [], "docs_url": "https://faq.whatsapp.com/1180414079177245", "supports_upload": True, "sample_hint": "Paste WhatsApp chat lines [DD/MM/YYYY, HH:MM] Name: Message"},
    {"id": "github", "name": "GitHub", "category": "Engineering", "auth": "oauth2", "icon": "git", "description": "Pull requests, code reviews, ADRs, commit history, and any public repo.", "scopes": ["repo", "read:user"], "env_vars": ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], "docs_url": "https://docs.github.com/apps/oauth-apps", "supports_upload": True, "sample_hint": "Connect OAuth or enter any public repo (e.g. maheshv09/memoryos)"},
    {"id": "slack", "name": "Slack", "category": "Communication", "auth": "oauth2", "icon": "message", "description": "Incident war-room channels, architecture debates, and team decisions.", "scopes": ["channels:history", "channels:read", "groups:history", "groups:read"], "env_vars": ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"], "docs_url": "https://api.slack.com/authentication/oauth-v2", "supports_upload": True, "sample_hint": "Paste a Slack channel thread or upload Slack JSON export"},
    {"id": "notion", "name": "Notion", "category": "Knowledge Base", "auth": "oauth2", "icon": "book", "description": "Engineering wikis, decision logs, personal journals, and team runbooks.", "scopes": ["read_content"], "env_vars": ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"], "docs_url": "https://developers.notion.com/docs/authorization", "supports_upload": True, "sample_hint": "Paste a Notion page or upload Markdown/CSV"},
    {"id": "zoom", "name": "Zoom Meetings", "category": "Meetings", "auth": "oauth2", "icon": "video", "description": "Cloud meeting transcripts, design review recordings, and action items.", "scopes": ["recording:read"], "env_vars": ["ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"], "docs_url": "https://developers.zoom.us/docs/api/", "supports_upload": True, "sample_hint": "Paste a meeting transcript or upload .vtt subtitles"},
    {"id": "teams", "name": "Microsoft Teams", "category": "Meetings", "auth": "oauth2", "icon": "users", "description": "Enterprise chat, steering committee transcripts, and meeting summaries.", "scopes": ["Chat.Read", "User.Read", "offline_access"], "env_vars": ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], "docs_url": "https://learn.microsoft.com/graph/", "supports_upload": True, "sample_hint": "Paste a Teams discussion or meeting summary"},
    {"id": "jira", "name": "Jira & Postmortems", "category": "Engineering", "auth": "oauth2", "icon": "kanban", "description": "Incident tickets, SEV-1 post-mortems, and architecture delivery history.", "scopes": ["read:jira-work", "read:jira-user", "offline_access"], "env_vars": ["ATLASSIAN_CLIENT_ID", "ATLASSIAN_CLIENT_SECRET"], "docs_url": "https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/", "supports_upload": True, "sample_hint": "Paste a Jira ticket or incident postmortem"},
    {"id": "voice_memos", "name": "Voice Memos & Audio", "category": "Personal", "auth": "device", "icon": "mic", "description": "Spoken reflections, morning walk notes, and live microphone voice capture.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True, "sample_hint": "Record live with your microphone or upload .mp3/.m4a/.wav"},
    {"id": "calendar", "name": "Google / iCal Calendar", "category": "Personal", "auth": "export", "icon": "calendar", "description": "Milestones, recurring family rituals, and architecture review schedules (.ics).", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True, "sample_hint": "Upload a .ics calendar export or sync sample events"},
    {"id": "obsidian", "name": "Obsidian Vault", "category": "Personal", "auth": "export", "icon": "notebook", "description": "Zettelkasten markdown notes, backlinks, and personal knowledge graphs.", "scopes": [], "env_vars": [], "docs_url": "https://help.obsidian.md/", "supports_upload": True, "sample_hint": "Upload .md notes or paste markdown reflection"},
    {"id": "apple_notes", "name": "Apple Notes", "category": "Personal", "auth": "export", "icon": "sticky", "description": "Late-night reflections, life checklists, and personal memos.", "scopes": [], "env_vars": [], "docs_url": "https://support.apple.com/guide/notes/", "supports_upload": True, "sample_hint": "Paste an Apple Note or upload .txt/.html"},
    {"id": "web_article", "name": "Web Article URL", "category": "Universal", "auth": "url", "icon": "globe", "description": "Fetch and distil any public article, essay, or documentation page by URL.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False, "sample_hint": "Enter any public https:// URL to fetch live"},
    {"id": "rss_feed", "name": "RSS / Substack Feed", "category": "Knowledge Base", "auth": "url", "icon": "rss", "description": "Substack essays, engineering blogs, and research feeds fetched by URL.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False, "sample_hint": "Enter any RSS/Atom XML feed URL"},
    {"id": "kindle", "name": "Kindle Highlights", "category": "Personal", "auth": "export", "icon": "book", "description": "Book highlights and margin notes from Kindle My Clippings.txt.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True, "sample_hint": "Upload My Clippings.txt or sync reading highlights"},
    {"id": "bookmarks", "name": "Browser Bookmarks", "category": "Personal", "auth": "export", "icon": "bookmark", "description": "Curated research trails and saved links from browser bookmark exports.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True, "sample_hint": "Upload bookmarks.html export"},
    {"id": "file_import", "name": "Universal Files & PDFs", "category": "Universal", "auth": "export", "icon": "upload", "description": "Universal .txt, .md, .json, .csv, .eml, .mbox, .ics, .html, and .vtt imports.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": True, "sample_hint": "Drop any document to normalize and crystallize"},
    {"id": "manual", "name": "Direct Memory Studio", "category": "Universal", "auth": "none", "icon": "pen", "description": "Directly authored memories, letters to the future, and architectural rules.", "scopes": [], "env_vars": [], "docs_url": "", "supports_upload": False, "sample_hint": "Write a direct memory or letter to 2050"},
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


# Realistic per-connector payloads for 1-click Live Sandbox Sync & Sample Previews (includes PII to demonstrate Gemma Redaction!)
CONNECTOR_DEMO_PAYLOADS: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "gmail": {
        "personal": [
            {
                "title": "Gmail: To my grandson Kabir — What to remember if you build machines in 2050",
                "content": "From: vikram.rao.isro@gmail.com | Contact: +91 98450 22910\n\nKabir, when you grow old enough to choose a craft, people will tell you that AI and automation have solved engineering. They haven't. Machines optimize what we can measure; humans are still responsible for what we value. If you become an engineer, never sign your name to a system whose failure mode you don't understand at 3 a.m. Build things that increase human dignity, not human dependency.",
                "year": 2025,
                "source_label": "Gmail · Family Legacy Thread",
            },
            {
                "title": "Gmail: Re: Cryogenic Turbopump Seal Review — Final Sign-off Notes",
                "content": "From: vikram.rao.isro@gmail.com\n\nTeam, before I hand over the propulsion review chair: remember that our 1994 launch delay happened because three teams shared a boundary and none owned the seal. I've attached the interface ownership checklist. Every bolt between two subsystems needs one human name next to it.",
                "year": 2017,
                "source_label": "Gmail · ISRO Handover Archive",
            },
        ],
        "enterprise": [
            {
                "title": "Gmail: [Barclays Core] FCA Regulator Sign-off on ISO-20022 Settlement RPO",
                "content": "From: arjun.mehta@barclays-core.com | Escalation: +44 7700 900412\n\nTo: Risk & Settlement Steering Committee\n\nWe closed the FCA regulator inquiry in 40 minutes today because our 2017 event-sourced ledger replayed the exact sequence of pacs.008 state transitions. Do NOT let the cloud migration team strip the immutable event log to save 18% storage cost. That audit trail is our license to operate.",
                "year": 2024,
                "source_label": "Gmail · Executive Compliance Thread",
            },
            {
                "title": "Gmail: Why I blocked the Active-Active Redis FX Cache proposal",
                "content": "From: arjun.mehta@barclays-core.com\n\nI am rejecting the active-active FX quote cache proposal until key-namespace ownership manifests are signed by both Treasury and Payments. In 2019, unowned Redis keys gave us 12 minutes of stale FX quotes. Fast wrong numbers are worse than a 4ms network hop.",
                "year": 2023,
                "source_label": "Gmail · Architecture Review Board",
            },
        ],
    },
    "whatsapp": {
        "personal": [
            {
                "title": "WhatsApp: Late-night chat with Rohan before his Series A pitch",
                "content": "[18/11/2024, 10:42:15 PM] Rohan (+91 98201 77419): Appa, the VCs want us to promise 10x revenue in 12 months or they walk.\n[18/11/2024, 10:45:02 PM] Vikram Rao: Let the ones who want theatre walk. A liar gets funded once; an honest engineer gets trusted for forty years. Show them your failure map and your repair loop. The right partner respects a founder who knows where the ice is thin.",
                "year": 2024,
                "source_label": "WhatsApp · Family Chat Export",
            }
        ],
        "enterprise": [
            {
                "title": "WhatsApp: SEV-1 Settlement War Room Backchannel (May 2021)",
                "content": "[14/05/2021, 03:14:09 AM] SRE On-Call (+44 7911 123456): Arjun, CPU is 22% and Kafka lag is zero, dashboard is all green, but CHAPS settlement hasn't cleared a transaction in 19 mins.\n[14/05/2021, 03:15:40 AM] Arjun Mehta: Check the pacs.008 semantic transform queue. Throughput is green because messages are silently dropping into the unmonitored schema reject sink. Halt ingress, drain to replayable DLQ, and page Treasury.",
                "year": 2021,
                "source_label": "WhatsApp · On-Call Escalation Export",
            }
        ],
    },
    "google_drive": {
        "personal": [
            {
                "title": "Google Doc: Forty Years of Engineering Lessons for My Grandchildren",
                "content": "Shared with: family-archive@gmail.com\n\n1. Buy the tool that makes your hands more valuable, then save what remains.\n2. When a kite refuses to fly, it isn't broken—it is teaching you the wind. Change one variable at a time.\n3. Never confuse being agreeable with being kind. Speak your quiet doubt when the room is loud.",
                "year": 2025,
                "source_label": "Google Drive · Family Legacy Vault",
            }
        ],
        "enterprise": [
            {
                "title": "Google Doc: Barclays Core Banking 2025 Retirement Handover & Invariant Map",
                "content": "Author: arjun.mehta@barclays-core.com\n\nCritical Systems Handover:\n- Settlement Engine: Active-Passive across London & Dublin with deterministic 4s RPO failover.\n- Idempotency Boundary: Enforced at API Gateway (ADR-027) with 24h canonical SHA-256 replay window.\n- Open Risk to Revisit in 2026: The custom FX reconciliation batch window can move to streaming ONLY after dual-ledger shadow verification passes 90 consecutive business days.",
                "year": 2025,
                "source_label": "Google Drive · Principal Architect Handover",
            }
        ],
    },
    "slack": {
        "personal": [
            {
                "title": "Slack #mentorship: Advice to Young Propulsion Engineers",
                "content": "@vikram.rao: When your career hits a plateau and louder people get promoted, treat maintenance as archaeology. Every legacy valve or script exists because something once bled. The engineer who understands the foundation becomes indispensable when the crisis arrives.",
                "year": 2023,
                "source_label": "Slack · Alumni Engineering Workspace",
            }
        ],
        "enterprise": [
            {
                "title": "Slack #core-ledger-architecture: Why the Ledger Must Stay Boring",
                "content": "@arjun.mehta (arjun.mehta@barclays-core.com): Team, I know the new distributed graph cache looks exciting in benchmarks. Put experiments at the edge, never in the financial truth. If an auditor asks why £4.2M moved twice and our answer requires a whiteboard and three probabilistic caveats, we have failed as architects.",
                "year": 2024,
                "source_label": "Slack · #core-ledger-architecture",
            }
        ],
    },
    "github": {
        "personal": [
            {
                "title": "GitHub: vikram-rao/orbital-telemetry-sim — Commit & README Notes",
                "content": "Open-source educational orbital mechanics & telemetry simulator written after retirement for neighborhood students. Enforces explicit unit types (Newton-seconds vs pound-force) at compile time so students learn how unit mismatches destroy spacecraft.",
                "year": 2024,
                "source_label": "GitHub · vikram-rao/orbital-telemetry-sim",
            }
        ],
        "enterprise": [
            {
                "title": "GitHub PR #412: Enforce Canonical Idempotency & Replay DLQ on ISO-20022 Gateway",
                "content": "Reviewed by @arjun-mehta: Enforces SHA-256 payload fingerprinting at the API gateway boundary before database transaction allocation. Eliminates duplicate settlement charges under client retry storms and adds deterministic DLQ replay hooks.",
                "year": 2024,
                "source_label": "GitHub · core-banking/iso20022-gateway#412",
            }
        ],
    },
    "notion": {
        "personal": [
            {
                "title": "Notion Journal: The Sunday Maintenance Rule for Marriage & Life",
                "content": "Every Sunday morning at 8 a.m., repair one small thing in the house or in your relationships—a leaking garden tap or an unsaid apology. Romance is weather; maintenance is climate. Don't wait for a storm to fix the roof.",
                "year": 2022,
                "source_label": "Notion · Personal Life Operating Manual",
            }
        ],
        "enterprise": [
            {
                "title": "Notion Runbook: Three-SLO Alignment Matrix (Compliance vs Treasury vs Support)",
                "content": "Real-Time Payments Governance:\n- Compliance SLO: Immutable audit queryable within 5 seconds.\n- Treasury SLO: Liquidity position updated within 2 seconds.\n- Customer Support SLO: End-user payment state visible within 1 second.\nAll three consume from one canonical append-only settlement event log.",
                "year": 2023,
                "source_label": "Notion · Payments Architecture Wiki",
            }
        ],
    },
    "zoom": {
        "personal": [
            {
                "title": "Zoom Recording Transcript: Fireside Chat with IIT Graduating Class",
                "content": "Speaker — Vikramaditya Rao: “You are entering a world obsessed with speed. My plea to you is to fall in love with durability. Ask of every career choice: will this still make sense when I am tired, broke, or alone? If yes, give it everything you have.”",
                "year": 2024,
                "source_label": "Zoom · IIT Alumni Keynote Transcript",
            }
        ],
        "enterprise": [
            {
                "title": "Zoom Recording Transcript: Q4 Core Ledger Strangler-Fig Migration Review",
                "content": "Speaker — Arjun Mehta: “I will not sign off on a big-bang cutover. Show me the strangler-fig routing table, the 4-second rollback trigger, and the list of legacy Oracle behaviors we still haven't mapped. Ignorance of legacy edge cases is not a migration strategy.”",
                "year": 2024,
                "source_label": "Zoom · Architecture Steering Committee",
            }
        ],
    },
    "teams": {
        "personal": [
            {
                "title": "Teams Meeting Summary: Community STEM Mentorship Curriculum",
                "content": "Notes from Vikram Rao's neighborhood physics & debugging workshop: teach children to isolate one variable at a time and keep a paper lab notebook that cannot be silently edited.",
                "year": 2024,
                "source_label": "Microsoft Teams · STEM Mentors",
            }
        ],
        "enterprise": [
            {
                "title": "Teams Thread: Executive SLA Alignment with Group CEO & Regulator",
                "content": "Arjun Mehta to Executive Committee: Promising 99.999% uptime without funding dependency resilience is an engineering lie. We committed to 99.95% with a transparent error budget, automated failover rehearsals on the first Tuesday of every month, and human-in-the-loop review for high-value fraud reversals.",
                "year": 2023,
                "source_label": "Microsoft Teams · Core Banking Exec Channel",
            }
        ],
    },
    "jira": {
        "personal": [
            {
                "title": "Postmortem Archive: 1994 Cryogenic Valve Seal 41-Day Grounding",
                "content": "Root Cause: A seal costing less than a dinner failed because three subsystem handoffs had no single accountable engineer. Corrective Action: Assigned a single named interface owner to every hardware and software boundary.",
                "year": 1994,
                "source_label": "Issue Archive · LAUNCH-1994-07",
            }
        ],
        "enterprise": [
            {
                "title": "Jira Postmortem INC-2024-089: Stale Connector Cursor & Idempotency Fix",
                "content": "Reporter: arjun.mehta@barclays-core.com | Severity: SEV-2\nRoot Cause: Ephemeral in-memory cursor caused duplicate ingestion after pod restart. Fix: Persisted opaque cursor to durable storage, enforced SHA-256 idempotency keys, and added duplicate-rate spike alerting.",
                "year": 2024,
                "source_label": "Jira · INC-2024-089",
            }
        ],
    },
    "voice_memos": {
        "personal": [
            {
                "title": "Voice Memo: Morning Walk in Bangalore — On Aging and Pattern Recognition",
                "content": "Audio Transcript (04:12): “Aging is not decline; it is compression. I don't have the raw calculation speed I had at twenty-five, but I can smell a flawed boundary assumption in five minutes. A good week now is measured by how many young engineers leave my porch less confused than they arrived.”",
                "year": 2025,
                "source_label": "Voice Memos · Bangalore_Morning_Walk.m4a",
            }
        ],
        "enterprise": [
            {
                "title": "Voice Memo: Post-Audit Dictation — Why Compliance Improves Engineering",
                "content": "Audio Transcript (03:48): “Every engineer complains about bank regulators until an immutable audit trail saves them during a 2 a.m. incident. When every production change has to be explainable in one page to an auditor, casual cowboy changes disappear.”",
                "year": 2024,
                "source_label": "Voice Memos · Post_FCA_Audit_Note.m4a",
            }
        ],
    },
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
                "status": saved.get("status") or ("ready" if connected else "ready_to_connect"),
                "last_error": saved.get("last_error"),
                "mode": saved.get("mode") or ("oauth" if saved.get("access_token") else "sandbox"),
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
            oauth_configured = bool(config and os.getenv(config["client_id"]) and os.getenv(config["client_secret"]))
            out.append({
                **c,
                "connected": s["connected"],
                "last_sync": s.get("last_sync"),
                "status": s.get("status"),
                "last_error": s.get("last_error"),
                "mode": s.get("mode", "sandbox"),
                "oauth_configured": oauth_configured,
                "configured": True,  # Always usable via Live OAuth, Sandbox OAuth Sync, Direct Paste, or File Import
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

    def get_sample_payload(self, connector_id: str, persona: PersonaId) -> Dict[str, Any]:
        persona_key = "personal" if persona == PersonaId.personal else "enterprise"
        items = CONNECTOR_DEMO_PAYLOADS.get(connector_id, {}).get(persona_key)
        if items:
            return items[0]
        if persona == PersonaId.personal:
            return {
                "title": f"{connector_id.replace('_', ' ').title()} — Personal Reflection Note",
                "content": "Contact: vikram.rao@isro-archive.org | Phone: +91 98450 11223\n\nWhen we tested the cryogenic stage in 1991, we wrote down the single measurement that could falsify our hypothesis every morning. Good engineering is making embarrassment reproducible.",
                "year": 2024,
                "source_label": f"{connector_id} import",
            }
        return {
            "title": f"{connector_id.replace('_', ' ').title()} — Enterprise Architecture Record",
            "content": "Author: arjun.mehta@barclays-core.com | On-Call: +44 7700 900412\n\nDecision: Enforce deterministic active-passive failover with 4-second RPO and SHA-256 API-boundary idempotency keys on the ISO-20022 settlement ledger.",
            "year": 2024,
            "source_label": f"{connector_id} import",
        }

    def authorization_url(self, connector_id: str, redirect_uri: str) -> Dict[str, Any]:
        config = OAUTH_CONFIG.get(connector_id)
        if not config:
            raise ValueError("This connector uses direct sync or file import, not OAuth.")
        client_id = os.getenv(config["client_id"])
        client_secret = os.getenv(config["client_secret"])
        if not client_id or not client_secret:
            return {
                "requires_config": True,
                "can_sandbox_connect": True,
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
            "mode": "oauth",
            "last_error": None,
        })
        self._save_tokens()
        self._log(connector_id, "connected", "Live OAuth 2.0 authorization completed.")
        return {"connected": True, "connector": connector_id, "mode": "oauth"}

    def connect_local(self, connector_id: str, mode: str = "sandbox") -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        self.state[connector_id].update({
            "connected": True,
            "status": "connected",
            "mode": mode,
            "last_error": None,
        })
        self._save_tokens()
        label = "Instant OAuth Sandbox Session authorized." if definition["auth"] == "oauth2" else "Connector source enabled and ready."
        self._log(connector_id, "connected", label)
        return {"connected": True, "connector": connector_id, "mode": mode}

    def disconnect(self, connector_id: str) -> Dict[str, Any]:
        if connector_id not in self.state:
            raise ValueError("Unknown connector")
        self.state[connector_id].update({
            "connected": False,
            "access_token": None,
            "refresh_token": None,
            "expires_at": None,
            "status": "disconnected",
        })
        self._save_tokens()
        self._log(connector_id, "disconnected", "Connector disconnected.")
        return {"connected": False, "connector": connector_id}

    async def _valid_token(self, connector_id: str) -> Optional[str]:
        s = self.state.get(connector_id, {})
        token = s.get("access_token")
        if not token:
            return None
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

    def _build_pipeline_telemetry(self, raw_texts: List[str], created_items: List[Any]) -> List[Dict[str, Any]]:
        total_chars = sum(len(t) for t in raw_texts)
        redacted_count = sum(1 for item in created_items if getattr(item, "redacted", False))
        all_entities = sorted({e for item in created_items for e in (getattr(item, "entities", []) or [])})
        all_traits = sorted({t for item in created_items for t in (getattr(item, "cognitive_traits", []) or [])})
        dupes = sum(1 for item in created_items if getattr(item, "duplicate_of", None))
        return [
            {"id": "normalize", "title": "1. Normalize", "model": "Canonical Parser", "status": "completed", "detail": f"Normalized {len(created_items)} records ({total_chars} chars) into canonical UTF-8 memory blocks."},
            {"id": "redact", "title": "2. Redact PII", "model": "Gemma 3 Edge Shield", "status": "completed", "detail": f"Scanned for emails, phones, and secrets · {redacted_count} record(s) sanitized locally."},
            {"id": "extract", "title": "3. Extract Entities", "model": "Gemini 2.5 Flash", "status": "completed", "detail": f"Extracted {len(all_entities)} entities: {', '.join(all_entities[:5]) or 'core domain concepts'}."},
            {"id": "fingerprint", "title": "4. Cognitive Fingerprint", "model": "Gemini 2.5 Flash", "status": "completed", "detail": f"Tagged traits ({', '.join(all_traits[:4]) or 'reflective'}) & emotional tone."},
            {"id": "dedupe", "title": "5. Dedupe & Conflict", "model": "Cosine Threshold 0.93", "status": "completed", "detail": f"Checked against existing constellation · {dupes} duplicate(s) flagged."},
            {"id": "embed", "title": "6. Hybrid Embed", "model": "1536-d Semantic + N-Gram", "status": "completed", "detail": f"Computed normalized 1536-dim vectors for {len(created_items)} memory node(s)."},
            {"id": "graph", "title": "7. Synaptic Link", "model": "Constellation Graph Engine", "status": "completed", "detail": f"Linked {len(created_items)} node(s) into top-3 nearest synaptic neighbors."},
        ]

    async def sync(self, connector_id: str, persona: PersonaId, era: int = 2026) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")

        # Automatically mark connected if user hits Sync Now directly
        if not self.state.get(connector_id, {}).get("connected"):
            self.connect_local(connector_id, mode="sandbox")

        docs: List[Dict[str, Any]] = []
        sync_mode = "sandbox"
        token = await self._valid_token(connector_id)
        if token and connector_id in PROVIDER_SYNC:
            try:
                docs = await PROVIDER_SYNC[connector_id](token)
                sync_mode = "live_oauth"
            except Exception as exc:
                self._log(connector_id, "fallback", f"Live OAuth returned ({str(exc)[:120]}); using realistic provider dataset.")
                docs = []

        if not docs:
            persona_key = "personal" if persona == PersonaId.personal else "enterprise"
            docs = CONNECTOR_DEMO_PAYLOADS.get(connector_id, {}).get(persona_key, [])
            if not docs:
                docs = [self.get_sample_payload(connector_id, persona)]

        created_ids: List[str] = []
        created_items: List[Any] = []
        raw_texts: List[str] = []
        for d in docs[:30]:
            raw_texts.append(d["content"])
            req = MemoryCreateRequest(
                persona=persona,
                title=d["title"][:180],
                content=d["content"],
                tags=[connector_id, "connector-sync", sync_mode],
                year=min(era, int(d.get("year", era))),
                source_type=d.get("source_type", connector_id),
                source_connector=connector_id,
                source_label=d.get("source_label") or definition["name"],
                metadata={"connector": connector_id, "sync": sync_mode},
            )
            item = self.engine.create_from_request(req)
            created_ids.append(item.id)
            created_items.append(item)

        self.state[connector_id].update({
            "connected": True,
            "last_sync": datetime.utcnow().isoformat() + "Z",
            "status": "synced",
            "last_error": None,
        })
        self._save_tokens()
        pipeline_stages = self._build_pipeline_telemetry(raw_texts, created_items)
        self._log(connector_id, "synced", f"Ingested {len(created_ids)} memories from {definition['name']} through 7-stage pipeline.")
        return {
            "connector": connector_id,
            "ingested": len(created_ids),
            "memory_ids": created_ids,
            "memories": [m.model_dump() for m in created_items],
            "pipeline_stages": pipeline_stages,
            "source": definition["name"],
            "mode": sync_mode,
        }

    async def ingest_raw_payload(
        self,
        connector_id: str,
        title: str,
        content: str,
        persona: PersonaId,
        era: int = 2026,
        source_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        if not content.strip():
            raise ValueError("Content cannot be empty.")

        self.connect_local(connector_id, mode="direct")
        req = MemoryCreateRequest(
            persona=persona,
            title=(title.strip() or f"{definition['name']} Memory")[:180],
            content=content.strip(),
            tags=[connector_id, "live-ingest"],
            year=era,
            source_type=connector_id,
            source_connector=connector_id,
            source_label=source_label or f"{definition['name']} · Direct Ingest",
            metadata={"connector": connector_id, "raw_length": len(content)},
        )
        item = self.engine.create_from_request(req)
        self.state[connector_id]["last_sync"] = datetime.utcnow().isoformat() + "Z"
        self._save_tokens()
        pipeline_stages = self._build_pipeline_telemetry([content], [item])
        self._log(connector_id, "crystallized", f"Crystallized '{item.title}' (quality {int(item.quality_score * 100)}%).")
        return {
            "connector": connector_id,
            "ingested": 1,
            "memory_ids": [item.id],
            "memories": [item.model_dump()],
            "pipeline_stages": pipeline_stages,
            "redacted": item.redacted,
            "redacted_content": item.content,
            "entities": item.entities,
            "cognitive_traits": item.cognitive_traits,
            "emotional_tone": item.emotional_tone,
            "quality_score": item.quality_score,
        }

    async def sync_public_github(self, target: str, persona: PersonaId, era: int = 2026) -> Dict[str, Any]:
        """Fetches real commits, README, and issues from any public GitHub repository (owner/repo) or username without needing OAuth."""
        cleaned = target.strip().replace("https://github.com/", "").strip("/")
        if not cleaned:
            raise ValueError("Enter a GitHub repository (e.g. maheshv09/memoryos) or username.")
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "MemoryOS-Buildathon/2.0"}
        docs: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            if "/" in cleaned:
                repos = [cleaned]
            else:
                r = await client.get(f"https://api.github.com/users/{cleaned}/repos", headers=headers, params={"sort": "updated", "per_page": 3})
                if r.status_code != 200:
                    raise ValueError(f"GitHub user '{cleaned}' could not be fetched (HTTP {r.status_code}).")
                repos = [item["full_name"] for item in r.json()[:3] if item.get("full_name")]

            for full_name in repos[:3]:
                repo_resp = await client.get(f"https://api.github.com/repos/{full_name}", headers=headers)
                if repo_resp.status_code == 200:
                    rdata = repo_resp.json()
                    desc = rdata.get("description") or "Engineering repository"
                    lang = rdata.get("language") or "Multi-language"
                    stars = rdata.get("stargazers_count", 0)
                    docs.append({
                        "title": f"GitHub Repo {full_name}: {desc[:90]}",
                        "content": f"Repository: {full_name}\nPrimary Language: {lang} · Stars: {stars}\nDescription: {desc}\nURL: {rdata.get('html_url', '')}",
                        "year": min(era, _year_from_text(rdata.get("updated_at", "")) or era),
                        "source_label": f"https://github.com/{full_name}",
                    })
                commits_resp = await client.get(f"https://api.github.com/repos/{full_name}/commits", headers=headers, params={"per_page": 4})
                if commits_resp.status_code == 200:
                    commit_lines = []
                    for c in commits_resp.json()[:4]:
                        msg = ((c.get("commit") or {}).get("message") or "").strip().splitlines()[0]
                        author = ((c.get("commit") or {}).get("author") or {}).get("name") or "author"
                        sha = (c.get("sha") or "")[:7]
                        if msg:
                            commit_lines.append(f"- [{sha}] {msg} (by {author})")
                    if commit_lines:
                        docs.append({
                            "title": f"GitHub Commits — {full_name}",
                            "content": f"Recent engineering commit history on {full_name}:\n" + "\n".join(commit_lines),
                            "year": era,
                            "source_label": f"https://github.com/{full_name}/commits",
                        })

        if not docs:
            raise ValueError(f"No public data found on GitHub for '{target}'.")

        created_ids: List[str] = []
        created_items: List[Any] = []
        raw_texts: List[str] = []
        for d in docs:
            raw_texts.append(d["content"])
            item = self.engine.create_from_request(
                MemoryCreateRequest(
                    persona=persona,
                    title=d["title"][:180],
                    content=d["content"],
                    tags=["github", "public-github-live"],
                    year=d.get("year", era),
                    source_type="github",
                    source_connector="github",
                    source_label=d.get("source_label"),
                    metadata={"connector": "github", "target": cleaned},
                )
            )
            created_ids.append(item.id)
            created_items.append(item)

        self.state["github"].update({
            "connected": True,
            "last_sync": datetime.utcnow().isoformat() + "Z",
            "status": "synced",
            "last_error": None,
        })
        self._save_tokens()
        pipeline_stages = self._build_pipeline_telemetry(raw_texts, created_items)
        self._log("github", "public_sync", f"Fetched {len(created_ids)} live records from GitHub ({cleaned}).")
        return {
            "connector": "github",
            "ingested": len(created_ids),
            "memory_ids": created_ids,
            "memories": [m.model_dump() for m in created_items],
            "pipeline_stages": pipeline_stages,
            "target": cleaned,
        }

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
            headers={"User-Agent": "MemoryOS/2.0 (+https://memoryos.local)"},
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
        created_items = []
        raw_texts = []
        for d in docs[:12]:
            raw_texts.append(d["content"])
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
            created_items.append(item)
        self.state[connector_id].update({
            "connected": True,
            "last_sync": datetime.utcnow().isoformat() + "Z",
            "status": "ready",
            "last_error": None,
        })
        self._save_tokens()
        pipeline_stages = self._build_pipeline_telemetry(raw_texts, created_items)
        self._log(connector_id, "fetched", f"Ingested {len(created)} items from {url}.")
        return {
            "connector": connector_id,
            "ingested": len(created),
            "memory_ids": created,
            "memories": [m.model_dump() for m in created_items],
            "pipeline_stages": pipeline_stages,
            "source": definition["name"],
            "url": url,
        }

    async def import_file(self, connector_id: str, filename: str, data: bytes, persona: PersonaId, year: Optional[int] = None) -> Dict[str, Any]:
        definition = next((c for c in CONNECTOR_DEFINITIONS if c["id"] == connector_id), None)
        if not definition:
            raise ValueError("Unknown connector")
        docs = parse_export(connector_id, filename, data, year)
        created = []
        created_items = []
        raw_texts = []
        for d in docs:
            raw_texts.append(d["content"])
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
            created_items.append(item)
        self.state[connector_id]["connected"] = True
        self.state[connector_id]["last_sync"] = datetime.utcnow().isoformat() + "Z"
        self._save_tokens()
        pipeline_stages = self._build_pipeline_telemetry(raw_texts, created_items)
        self._log(connector_id, "imported", f"Ingested {len(created)} documents from {filename}.")
        return {
            "connector": connector_id,
            "ingested": len(created),
            "memory_ids": created,
            "memories": [m.model_dump() for m in created_items],
            "pipeline_stages": pipeline_stages,
            "documents": len(docs),
        }

    @staticmethod
    def redact_pii(text: str) -> str:
        text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", text)
        text = re.sub(r"\+?\d[\d\s\-]{8,}\d", "[REDACTED_PHONE]", text)
        text = re.sub(r"\b(?:sk-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z\-_]{20,})\b", "[REDACTED_API_KEY]", text)
        return text

    @staticmethod
    def extract_entities(text: str) -> List[str]:
        entities = set(re.findall(r"\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*\b", text))
        for term in ["ISO-20022", "Redis", "Kafka", "Oracle", "PostgreSQL", "Slack", "Jira", "GitHub", "Notion", "ISRO", "IIT", "Barclays", "FCA", "CHAPS"]:
            if term.lower() in text.lower():
                entities.add(term)
        stop = {"The", "This", "When", "From", "What", "Every", "After", "Before", "Never", "Always"}
        return sorted(e for e in entities if e not in stop)[:12]

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
        return [{"title": f"WhatsApp chat — {filename}", "content": content, "year": now_year, "source_type": "whatsapp", "source_label": filename}]

    if connector_id == "slack" or (lower.endswith(".json") and "slack" in lower):
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

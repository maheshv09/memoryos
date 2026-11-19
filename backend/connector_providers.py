from __future__ import annotations

import base64
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx


def _year(value: Optional[str]) -> int:
    if not value:
        return datetime.utcnow().year
    m = re.search(r"(19|20)\d{2}", str(value))
    return int(m.group(0)) if m else datetime.utcnow().year


def _b64(data: str) -> str:
    try:
        return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _gmail_body(payload: Dict[str, Any]) -> str:
    if payload.get("body", {}).get("data"):
        return _b64(payload["body"]["data"])
    parts = payload.get("parts") or []
    texts = []
    for p in parts:
        if p.get("mimeType", "").startswith("text/"):
            texts.append(_gmail_body(p))
        elif p.get("parts"):
            texts.append(_gmail_body(p))
    return "\n".join(t for t in texts if t)


async def gmail_docs(token: str, limit: int = 15) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params={"maxResults": limit, "q": "newer_than:2y"},
        )
        r.raise_for_status()
        for m in r.json().get("messages", [])[:limit]:
            try:
                msg = await c.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}",
                    headers=headers,
                    params={"format": "full"},
                )
                msg.raise_for_status()
                data = msg.json()
                headers_list = data.get("payload", {}).get("headers", [])
                subject = next((h["value"] for h in headers_list if h["name"].lower() == "subject"), "Gmail thread")
                date = next((h["value"] for h in headers_list if h["name"].lower() == "date"), None)
                body = _gmail_body(data.get("payload", {}))
                if body.strip():
                    docs.append({"title": subject, "content": body[:12000], "year": _year(date), "source_type": "gmail", "source_label": "Gmail"})
            except Exception:
                continue
    return docs


async def drive_docs(token: str, limit: int = 12) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers,
            params={"pageSize": limit, "q": "trashed=false", "fields": "files(id,name,mimeType,modifiedTime,webViewLink)"},
        )
        r.raise_for_status()
        for f in r.json().get("files", [])[:limit]:
            try:
                if f["mimeType"].startswith("application/vnd.google-apps."):
                    resp = await c.get(
                        f"https://www.googleapis.com/drive/v3/files/{f['id']}/export",
                        headers=headers,
                        params={"mimeType": "text/plain"},
                    )
                else:
                    resp = await c.get(
                        f"https://www.googleapis.com/drive/v3/files/{f['id']}",
                        headers=headers,
                        params={"alt": "media"},
                    )
                if resp.status_code == 200 and resp.text.strip():
                    docs.append({
                        "title": f["name"],
                        "content": resp.text[:12000],
                        "year": _year(f.get("modifiedTime")),
                        "source_type": "google_drive",
                        "source_label": f.get("webViewLink") or "Google Drive",
                    })
            except Exception:
                continue
    return docs


async def notion_docs(token: str, limit: int = 12) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post("https://api.notion.com/v1/search", headers=headers, json={"page_size": limit, "filter": {"value": "page", "property": "object"}})
        r.raise_for_status()
        for page in r.json().get("results", [])[:limit]:
            page_id = page.get("id")
            title = "Notion page"
            try:
                props = page.get("properties", {})
                for p in props.values():
                    if p.get("type") == "title":
                        title = "".join(t.get("plain_text", "") for t in p.get("title", [])) or title
                        break
                blocks = await c.get(f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100", headers=headers)
                blocks.raise_for_status()
                texts = []
                for b in blocks.json().get("results", []):
                    for rich in (b.get("paragraph", {}).get("rich_text", []) or b.get("heading_1", {}).get("rich_text", []) or b.get("heading_2", {}).get("rich_text", []) or b.get("bulleted_list_item", {}).get("rich_text", [])):
                        texts.append(rich.get("plain_text", ""))
                content = "\n".join(texts).strip()
                if content:
                    docs.append({"title": title, "content": content[:12000], "year": _year(page.get("created_time")), "source_type": "notion", "source_label": "Notion"})
            except Exception:
                continue
    return docs


async def slack_docs(token: str, limit: int = 8) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get("https://slack.com/api/conversations.list", headers=headers, params={"types": "public_channel,private_channel", "limit": 30})
        r.raise_for_status()
        for ch in r.json().get("channels", [])[:limit]:
            try:
                h = await c.get("https://slack.com/api/conversations.history", headers=headers, params={"channel": ch["id"], "limit": 30})
                h.raise_for_status()
                msgs = [m.get("text", "") for m in h.json().get("messages", []) if m.get("text")]
                if msgs:
                    docs.append({
                        "title": f"Slack channel #{ch.get('name', 'channel')}",
                        "content": "\n".join(reversed(msgs))[:12000],
                        "year": datetime.utcnow().year,
                        "source_type": "slack",
                        "source_label": "Slack",
                    })
            except Exception:
                continue
    return docs


async def github_docs(token: str, limit: int = 15) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    raw_headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.raw"}
    docs: List[Dict[str, Any]] = []

    def add(doc: Dict[str, Any]) -> bool:
        if doc.get("content", "").strip():
            docs.append(doc)
        return len(docs) >= limit

    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get("https://api.github.com/user/repos", headers=headers, params={"sort": "updated", "per_page": 8})
        r.raise_for_status()
        for repo in r.json()[:8]:
            name = repo.get("name") or repo.get("full_name") or "repository"
            full_name = repo.get("full_name") or name
            description = repo.get("description") or ""
            if description and add({
                "title": f"{name}: {description[:90]}",
                "content": f"{description}\n\nRepository: {full_name}\nLanguage: {repo.get('language') or 'unknown'}",
                "year": _year(repo.get("updated_at")),
                "source_type": "github",
                "source_label": repo.get("html_url") or "GitHub",
            }):
                return docs
            try:
                readme = await c.get(f"https://api.github.com/repos/{full_name}/readme", headers=raw_headers)
                if readme.status_code == 200 and readme.text.strip():
                    if add({
                        "title": f"{name}: README",
                        "content": readme.text[:12000],
                        "year": _year(repo.get("updated_at")),
                        "source_type": "github",
                        "source_label": repo.get("html_url") or "GitHub",
                    }):
                        return docs
            except Exception:
                pass
            try:
                commits = await c.get(
                    f"https://api.github.com/repos/{full_name}/commits",
                    headers=headers,
                    params={"per_page": 5},
                )
                commits.raise_for_status()
                for commit in commits.json()[:5]:
                    message = ((commit.get("commit") or {}).get("message") or "").strip()
                    if not message:
                        continue
                    if add({
                        "title": f"{name}: {message.splitlines()[0][:90]}",
                        "content": message[:12000],
                        "year": _year(((commit.get("commit") or {}).get("author") or {}).get("date")),
                        "source_type": "github",
                        "source_label": commit.get("html_url") or repo.get("html_url") or "GitHub",
                    }):
                        return docs
            except Exception:
                pass
            try:
                issues = await c.get(
                    f"https://api.github.com/repos/{full_name}/issues",
                    headers=headers,
                    params={"state": "all", "per_page": 8},
                )
                issues.raise_for_status()
                for issue in issues.json()[:8]:
                    body = issue.get("body") or ""
                    if body.strip():
                        if add({
                            "title": f"{name}: {issue.get('title', 'Issue')}",
                            "content": body[:12000],
                            "year": _year(issue.get("created_at")),
                            "source_type": "github",
                            "source_label": issue.get("html_url") or "GitHub",
                        }):
                            return docs
            except Exception:
                continue
    return docs


async def zoom_docs(token: str, limit: int = 8) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get("https://api.zoom.us/v2/users/me/recordings", headers=headers, params={"page_size": limit})
        r.raise_for_status()
        for meeting in r.json().get("meetings", [])[:limit]:
            for f in meeting.get("recording_files", []):
                if f.get("file_type") == "TRANSCRIPT" and f.get("download_url"):
                    try:
                        t = await c.get(f["download_url"], headers=headers)
                        if t.status_code == 200 and t.text.strip():
                            docs.append({
                                "title": meeting.get("topic", "Zoom meeting transcript"),
                                "content": t.text[:12000],
                                "year": _year(meeting.get("start_time")),
                                "source_type": "zoom",
                                "source_label": "Zoom transcript",
                            })
                            break
                    except Exception:
                        continue
    return docs


async def teams_docs(token: str, limit: int = 10) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get("https://graph.microsoft.com/v1.0/me/chats", headers=headers, params={"$top": 15})
        r.raise_for_status()
        for chat in r.json().get("value", [])[:8]:
            try:
                msgs = await c.get(f"https://graph.microsoft.com/v1.0/me/chats/{chat['id']}/messages", headers=headers, params={"$top": 20})
                msgs.raise_for_status()
                texts = []
                for m in msgs.json().get("value", []):
                    body = m.get("body", {}).get("content", "")
                    if body:
                        texts.append(re.sub(r"<[^>]+>", " ", body))
                if texts:
                    docs.append({
                        "title": chat.get("topic") or "Teams conversation",
                        "content": "\n".join(texts)[:12000],
                        "year": datetime.utcnow().year,
                        "source_type": "teams",
                        "source_label": "Microsoft Teams",
                    })
            except Exception:
                continue
    return docs


async def jira_docs(token: str, limit: int = 12) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    docs: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30) as c:
        res = await c.get("https://api.atlassian.com/oauth/token/accessible-resources", headers=headers)
        res.raise_for_status()
        resources = res.json()
        if not resources:
            return docs
        cloud_id = resources[0]["id"]
        r = await c.get(
            f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/search",
            headers=headers,
            params={"jql": "order by updated DESC", "maxResults": limit, "fields": "summary,description,created,updated"},
        )
        r.raise_for_status()
        for issue in r.json().get("issues", [])[:limit]:
            fields = issue.get("fields", {})
            desc = fields.get("description")
            if isinstance(desc, dict):
                desc = " ".join(str(v) for v in desc.values())
            content = f"{fields.get('summary', '')}\n\n{desc or ''}".strip()
            if content:
                docs.append({
                    "title": fields.get("summary", "Jira issue"),
                    "content": content[:12000],
                    "year": _year(fields.get("created")),
                    "source_type": "jira",
                    "source_label": "Jira",
                })
    return docs


PROVIDER_SYNC = {
    "gmail": gmail_docs,
    "google_drive": drive_docs,
    "notion": notion_docs,
    "slack": slack_docs,
    "github": github_docs,
    "zoom": zoom_docs,
    "teams": teams_docs,
    "jira": jira_docs,
}

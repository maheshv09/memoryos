# MemoryOS

MemoryOS is a luxury-grade "Personal Digital Consciousness & Enterprise Knowledge Twin" platform. It combines a FastAPI memory engine with a React/Vite glassmorphic UI, dual personas, a synaptic memory graph, temporal filtering, live ingestion, and multi-provider LLM routing with automatic failover.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
# fill in GEMINI_API_KEY and GROQ_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend; set `VITE_API_BASE_URL` for production.

## Connector sources

MemoryOS ships with a production-shaped connector layer:

- **OAuth 2.0 connectors:** Gmail, Google Drive, Notion, Slack, Zoom, Microsoft Teams, Jira, GitHub
- **Zero-auth connectors:** Web Article URL, RSS/Atom feed, Calendar `.ics`, browser bookmarks HTML, Kindle `My Clippings.txt`
- **Export / device connectors:** WhatsApp export, Obsidian vault, Apple Notes export, Voice Memos, universal files
- **Manual memory** for directly authored reflections

The zero-auth connectors are ready immediately. Paste a public URL, fetch an RSS feed, or upload an export and the memories are normalized, redacted, fingerprinted, embedded, and linked. The **Load demo pack** button in Ingestion Studio populates a realistic multi-source demo without any external accounts.

Open the **Ingestion Studio** from the Connectors button in the Neural Constellation header. It is a full-screen n8n-style workflow canvas with source nodes, agentic transformation nodes, live sync, OAuth setup guidance, file import, and logs.

To enable OAuth connectors, add provider credentials to the backend environment:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Set `PUBLIC_BASE_URL` to the backend’s public origin (for local development, `http://localhost:8000`) and register the provider redirect URI as:

```text
https://YOUR-BACKEND-DOMAIN/oauth/{connector}/callback
```

Export connectors work immediately: connect the source, then import the provider’s export file. Connector tokens are stored in `backend/data/connector_tokens.json` with restrictive permissions and are git-ignored.

## Business & pricing

The app includes a **Business & Pricing** view from the Navbar. It covers:

- The business value: context recovery, onboarding speed, commitment tracking, and auditability
- An interactive ROI calculator using team size, hourly cost, and onboarding assumptions
- A free 14-day trial and the paid **Client Memory Audit** trial pack ($3,000, credited to annual)
- Personal, Team, Business, and Enterprise plans
- The MCP objection: ChatGPT/Claude + MCP gives access; MemoryOS provides shared, permissioned, auditable memory
- Buyer FAQ and a pilot CTA

Pricing copy and plan definitions live in `frontend/src/components/PricingModal.tsx` and are intentionally easy to configure per deployment.

## Deployment on Render.com (free tier)

This repo includes `render.yaml`:

- `memoryos-backend`: Python web service running `uvicorn main:app --host 0.0.0.0 --port $PORT`
- `memoryos-frontend`: static site built with `npm install && npm run build`, publishing `dist`

Set `GEMINI_API_KEY` and `GROQ_API_KEY` as secret environment variables on the backend service. Set `VITE_API_BASE_URL` on the frontend to the backend URL.

## Free-tier notes

- Render free web services sleep after inactivity; the UI shows "Waking Neural Core…" while polling `/health`.
- Local disk is ephemeral; use Export/Import JSON in the Crystallizer modal to preserve custom memories.
- Both Gemini and Groq free tiers have rate limits; `llm_router.py` fails over automatically and finally to a deterministic persona engine.
# Google Cloud deployment bundle

This is the ready-to-run Google Cloud configuration for MemoryOS. It deploys one **Cloud Run** service that serves both:

- the FastAPI memory engine, and
- the built React frontend at the same origin.

That means no separate static hosting account is required and API calls stay relative.

## What you need when Google Cloud credits are available

Replace these placeholders in `deploy/gcp/cloudbuild.yaml` / `deploy/gcp/deploy.sh`, or export them before running the script:

| Placeholder | Where it goes | Why |
|---|---|---|
| `__REPLACE_PROJECT_ID__` | `PROJECT_ID` | Your Google Cloud project ID |
| `__REPLACE_REGION__` | `REGION` | Preferred region, for example `us-central1` |
| `SERVICE_NAME` | `SERVICE_NAME` | Cloud Run service name, default `memoryos` |
| `IMAGE` | image URL | Artifact Registry image, generated from project/region |

The backend also needs these environment variables on Cloud Run:

```text
GEMINI_API_KEY=...
GROQ_API_KEY=...                 # optional fallback engine
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
VERTEXAI_PROJECT=...             # optional, for Vertex AI / Gemma depth
VERTEXAI_LOCATION=...            # optional, for Vertex AI / Gemma depth
PUBLIC_BASE_URL=https://YOUR-CLOUD-RUN-URL
FRONTEND_URL=https://YOUR-CLOUD-RUN-URL
```

Recommended: store `GEMINI_API_KEY`, `GROQ_API_KEY`, `GITHUB_CLIENT_SECRET`, and any other connector secrets in **Secret Manager**, then attach them with `--update-secrets`. Do not commit them.

## One-command deploy

```bash
cd /Users/keshavvaswani/Mahesh_Projects/MemoryOS
export PROJECT_ID="your-project-id"
export REGION="us-central1"
chmod +x deploy/gcp/deploy.sh
./deploy/gcp/deploy.sh
```

The script enables the required APIs, builds the container, pushes it, and deploys Cloud Run.

## Manual steps

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com secretmanager.googleapis.com
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions=_PROJECT_ID="$PROJECT_ID",_REGION="$REGION",_SERVICE_NAME="memoryos",_IMAGE="gcr.io/$PROJECT_ID/memoryos:latest"
```

## OAuth callbacks after deploy

After Cloud Run gives you a URL, update provider redirect URIs to:

```text
https://YOUR-CLOUD-RUN-URL/oauth/github/callback
https://YOUR-CLOUD-RUN-URL/oauth/gmail/callback
https://YOUR-CLOUD-RUN-URL/oauth/google_drive/callback
https://YOUR-CLOUD-RUN-URL/oauth/notion/callback
https://YOUR-CLOUD-RUN-URL/oauth/slack/callback
https://YOUR-CLOUD-RUN-URL/oauth/zoom/callback
https://YOUR-CLOUD-RUN-URL/oauth/microsoft_teams/callback
https://YOUR-CLOUD-RUN-URL/oauth/jira/callback
```

Then set `PUBLIC_BASE_URL` to the same Cloud Run URL.

## Google AI stack status

Once deployed, open:

```text
https://YOUR-CLOUD-RUN-URL/google-ai/status
```

It reports which parts of the Google AI stack are configured: Gemini, Gemini Live, Gemma, Vertex AI, Google AI Studio, and Agent Skills / MCP readiness.

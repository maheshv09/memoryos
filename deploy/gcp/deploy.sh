#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "__REPLACE_PROJECT_ID__")}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-memoryos}"
IMAGE="${IMAGE:-gcr.io/${PROJECT_ID}/memoryos:latest}"

if [[ "${PROJECT_ID}" == "__REPLACE_PROJECT_ID__" || "${PROJECT_ID}" == "" ]]; then
  echo "Set PROJECT_ID first (for example: export PROJECT_ID=my-gcp-project-id)" >&2
  exit 1
fi

echo "Deploying MemoryOS to Google Cloud Run (project=${PROJECT_ID}, region=${REGION}, service=${SERVICE_NAME})..."

gcloud config set project "${PROJECT_ID}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com

# Build and deploy via Cloud Build -> Cloud Run
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions=_PROJECT_ID="${PROJECT_ID}",_REGION="${REGION}",_SERVICE_NAME="${SERVICE_NAME}",_IMAGE="${IMAGE}"

# If local .env exists, sync GEMINI_API_KEY and GROQ_API_KEY to Cloud Run service environment
if [[ -f ".env" ]]; then
  echo "Applying runtime environment keys from .env to Cloud Run service..."
  source .env || true
  ENV_PAIRS="VERTEXAI_PROJECT=${PROJECT_ID},VERTEXAI_LOCATION=${REGION}"
  [[ -n "${GEMINI_API_KEY:-}" ]] && ENV_PAIRS="${ENV_PAIRS},GEMINI_API_KEY=${GEMINI_API_KEY}"
  [[ -n "${GROQ_API_KEY:-}" ]] && ENV_PAIRS="${ENV_PAIRS},GROQ_API_KEY=${GROQ_API_KEY}"
  [[ -n "${GITHUB_CLIENT_ID:-}" ]] && ENV_PAIRS="${ENV_PAIRS},GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}"
  [[ -n "${GITHUB_CLIENT_SECRET:-}" ]] && ENV_PAIRS="${ENV_PAIRS},GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}"
  gcloud run services update "${SERVICE_NAME}" --region="${REGION}" --update-env-vars="${ENV_PAIRS}"
fi

URL="$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')"
echo "=========================================================="
echo "MemoryOS Deployed on Google Cloud Run: ${URL}"
echo "Google AI Stack Status: ${URL}/google-ai/status"
echo "MCP Agent Skills Manifest: ${URL}/mcp/tools"
echo "OAuth Callback Base: ${URL}/oauth/<connector>/callback"
echo "=========================================================="

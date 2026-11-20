#!/usr/bin/env bash
set -euo pipefail

# Replace these placeholders when Google Cloud credits are available.
PROJECT_ID="${PROJECT_ID:-__REPLACE_PROJECT_ID__}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-memoryos}"
IMAGE="${IMAGE:-gcr.io/${PROJECT_ID}/memoryos:latest}"

if [[ "${PROJECT_ID}" == "__REPLACE_PROJECT_ID__" || "${PROJECT_ID}" == "" ]]; then
  echo "Set PROJECT_ID (for example: export PROJECT_ID=my-memoryos-project)" >&2
  exit 1
fi

echo "Using project=${PROJECT_ID} region=${REGION} service=${SERVICE_NAME}"

gcloud config set project "${PROJECT_ID}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com

# Deploy the full stack: API + built frontend in one Cloud Run service.
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions=_PROJECT_ID="${PROJECT_ID}",_REGION="${REGION}",_SERVICE_NAME="${SERVICE_NAME}",_IMAGE="${IMAGE}"

URL="$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')"
echo "Deployed: ${URL}"

# OAuth callbacks must use this origin. Update your GitHub OAuth app and
# Google OAuth client redirect URIs to:
echo "OAuth callback root: ${URL}/oauth/<connector>/callback"

# Recommended: store secrets in Secret Manager instead of plain env vars.
# Example:
#   printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --replication-policy=automatic
#   gcloud run services update "${SERVICE_NAME}" --region="${REGION}" \
#     --update-secrets=GEMINI_API_KEY=gemini-api-key:latest

#!/usr/bin/env bash
set -euo pipefail
export PATH="/tmp/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0748881029}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-memoryos}"
REPO_NAME="memoryos-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "Deploying MemoryOS to Google Cloud Run (project=${PROJECT_ID}, region=${REGION}, service=${SERVICE_NAME})..."

gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com

ACCOUNT="$(gcloud config get-value account)"
PROJECT_NUM="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"

# Ensure active caller and Cloud Build / Compute service accounts have required IAM permissions
for ROLE in roles/serviceusage.serviceUsageConsumer roles/cloudbuild.builds.editor roles/storage.admin roles/artifactregistry.admin roles/run.admin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="user:${ACCOUNT}" \
    --role="${ROLE}" --quiet >/dev/null 2>&1 || true
done

for SA in "${PROJECT_NUM}@cloudbuild.gserviceaccount.com" "${PROJECT_NUM}-compute@developer.gserviceaccount.com"; do
  for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/storage.admin roles/logging.logWriter; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${SA}" \
      --role="${ROLE}" --quiet >/dev/null 2>&1 || true
  done
done

# Create Artifact Registry repository if it does not exist yet
gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="MemoryOS Docker repository"

# Build and deploy via Cloud Build -> Cloud Run (or deploy existing image if --deploy-only passed)
if [[ "${1:-}" == "--deploy-only" ]]; then
  gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE}" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=3 \
    --memory=512Mi \
    --cpu=1 \
    --set-env-vars="PYTHON_VERSION=3.11.9,VERTEXAI_PROJECT=${PROJECT_ID},VERTEXAI_LOCATION=${REGION}"
else
  gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
    --substitutions=_PROJECT_ID="${PROJECT_ID}",_REGION="${REGION}",_SERVICE_NAME="${SERVICE_NAME}",_IMAGE="${IMAGE}"
fi

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

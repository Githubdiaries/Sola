#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID=${PROJECT_ID:?Set PROJECT_ID}
REGION=${REGION:-asia-south1}
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/sola/sola-backend:latest"
gcloud artifacts repositories create sola --repository-format=docker --location="$REGION" --project="$PROJECT_ID" || true
gcloud builds submit backend --tag "$IMAGE" --project="$PROJECT_ID"
gcloud run deploy sola-backend --image "$IMAGE" --region "$REGION" --platform managed --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},VERTEX_AI_LOCATION=${REGION}"

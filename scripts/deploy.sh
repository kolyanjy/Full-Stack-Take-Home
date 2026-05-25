#!/usr/bin/env bash
set -euo pipefail

REGION=$(cd terraform && terraform output -raw aws_region 2>/dev/null || echo "us-east-1")
BACKEND_REPO=$(cd terraform && terraform output -raw backend_ecr_url)
FRONTEND_REPO=$(cd terraform && terraform output -raw frontend_ecr_url)
APP_URL=$(cd terraform && terraform output -raw app_url)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "→ Logging into ECR..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "→ Building and pushing backend..."
docker build -t "$BACKEND_REPO:latest" ./backend
docker push "$BACKEND_REPO:latest"

echo "→ Building and pushing frontend (NEXT_PUBLIC_API_URL=$APP_URL/v1)..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL="$APP_URL/v1" \
  -t "$FRONTEND_REPO:latest" \
  ./frontend
docker push "$FRONTEND_REPO:latest"

echo "→ Forcing ECS redeployment..."
aws ecs update-service \
  --cluster emissions-cluster \
  --service emissions-backend \
  --force-new-deployment \
  --region "$REGION" \
  --output json > /dev/null

aws ecs update-service \
  --cluster emissions-cluster \
  --service emissions-frontend \
  --force-new-deployment \
  --region "$REGION" \
  --output json > /dev/null

echo "✓ Deploy triggered. App will be live at $APP_URL in ~2 minutes."

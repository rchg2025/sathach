#!/bin/bash
set -e

# Configuration
VPS_HOST="103.167.89.161"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/id_vps_nsg"
REMOTE_DIR="/var/www/sathach"

echo "=========================================="
echo "🚀 1. Pushing latest changes to GitHub..."
echo "=========================================="
if git diff-index --quiet HEAD --; then
  echo "No local uncommitted git changes."
else
  COMMIT_MSG="${1:-Update source code}"
  echo "Committing with message: '$COMMIT_MSG'"
  git add .
  git commit -m "$COMMIT_MSG"
fi

echo "Pushing to origin..."
git push origin main || echo "Git push warning: Please check origin remote"

echo ""
echo "=========================================="
echo "🏗️ 2. Building Frontend locally..."
echo "=========================================="
npm run build

echo ""
echo "=========================================="
echo "📦 3. Syncing files to VPS ($VPS_HOST)..."
echo "=========================================="
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  -e "ssh -F /dev/null -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
  ./ $VPS_USER@$VPS_HOST:$REMOTE_DIR/

echo ""
echo "=========================================="
echo "⚡ 4. Reloading on VPS..."
echo "=========================================="
ssh -F /dev/null -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_USER@$VPS_HOST << 'REMOTE_EXEC'
cd /var/www/sathach
echo "Restarting sathach.service..."
systemctl restart sathach
sleep 2
systemctl status sathach --no-pager
REMOTE_EXEC

echo ""
echo "=========================================="
echo "✅ SYNC COMPLETED SUCCESSFULLY!"
echo "🌐 URL: https://sathach.nsgpc.edu.vn"
echo "=========================================="

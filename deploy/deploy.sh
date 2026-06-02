#!/bin/bash
set -euo pipefail

# PrepAgent Deployment Script
# Run this on the EC2 instance to deploy the latest version

echo "=== PrepAgent Deploy ==="

cd /home/ubuntu/prepagent

# Pull latest code
echo "Pulling latest code..."
git pull

# Rebuild and restart changed services
echo "Rebuilding and restarting services..."
sudo docker-compose -f docker-compose.prod.yml up -d --build --no-deps --remove-orphans

# Run database migrations
echo "Running database migrations..."
sudo docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Clean up old images
echo "Cleaning up old images..."
sudo docker image prune -f

echo "=== Deploy Complete ==="
echo "Verify: sudo docker-compose -f docker-compose.prod.yml ps"

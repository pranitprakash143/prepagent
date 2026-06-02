#!/bin/bash
set -euo pipefail

# PrepAgent EC2 Setup Script
# Run this on a fresh Ubuntu 22.04 EC2 instance

echo "=== PrepAgent EC2 Setup ==="

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone repository
if [ ! -d "prepagent" ]; then
    echo "Cloning repository..."
    git clone https://github.com/your-org/prepagent.git
    cd prepagent
else
    cd prepagent
    git pull
fi

# Set up environment
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'ENVEOF'
# Database
DB_USER=prepagent
DB_PASSWORD=<change-me>
DB_NAME=prepagent_db

# Auth
SECRET_KEY=<generate-a-random-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# S3 (optional)
USE_S3=False
AWS_S3_BUCKET=
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Frontend
NEXT_PUBLIC_API_URL=https://prepagent.app/api
ENVEOF
    echo "!!! WARNING: Edit .env with real values before proceeding !!!"
    echo "!!! Run: nano .env !!!"
fi

# Start services
echo "Starting services..."
sudo docker-compose -f docker-compose.prod.yml up -d

echo "=== Setup Complete ==="
echo "Run 'sudo docker-compose -f docker-compose.prod.yml logs -f' to monitor"

#!/usr/bin/env bash
set -e

echo "==> Building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "==> Copying dist to backend..."
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist

echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "==> Build complete!"

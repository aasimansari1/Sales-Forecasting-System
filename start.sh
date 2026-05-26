#!/usr/bin/env bash
set -e
cd backend
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-10000}"

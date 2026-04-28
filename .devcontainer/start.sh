#!/usr/bin/env bash
# Runs inside GitHub Codespaces after the container starts.
# Detects the Codespaces forwarded URLs and wires them into both servers.
set -e

CODESPACE="${CODESPACE_NAME:-}"

if [ -n "$CODESPACE" ]; then
  BACKEND_URL="https://${CODESPACE}-3001.app.github.dev"
  FRONTEND_URL="https://${CODESPACE}-5173.app.github.dev"
  echo "Codespaces detected:"
  echo "  Backend  → $BACKEND_URL"
  echo "  Frontend → $FRONTEND_URL"
  echo ""
  echo "Share this URL with your friends to play:"
  echo "  $FRONTEND_URL"
  echo ""

  # Write env files (overwrite each start so URLs stay fresh)
  echo "PORT=3001"                       >  backend/.env
  echo "CLIENT_URL=$FRONTEND_URL"        >> backend/.env

  echo "VITE_SERVER_URL=$BACKEND_URL"    >  frontend/.env
else
  echo "Running locally — using defaults (localhost:3001 / localhost:5173)"
  echo "PORT=3001"                       >  backend/.env
  echo "CLIENT_URL=http://localhost:5173" >> backend/.env
  echo "VITE_SERVER_URL=http://localhost:3001" > frontend/.env
fi

# Start backend in background, frontend in foreground
echo "Starting backend…"
cd backend && npm run dev &

echo "Starting frontend…"
cd frontend && npm run dev -- --host 0.0.0.0

#!/usr/bin/env bash
# Démarreur idempotent du dev server (évite les instances dupliquées).
cd /home/z/my-project
if curl -s -o /dev/null -m 3 -w "" http://localhost:3000/ 2>/dev/null; then
  echo "server:already-running"
  exit 0
fi
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1
setsid nohup bun run dev >> dev.log 2>&1 < /dev/null &
disown 2>/dev/null || true
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "server:ready"
    exit 0
  fi
  sleep 1
done
echo "server:failed"
exit 1

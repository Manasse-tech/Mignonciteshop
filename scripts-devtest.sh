#!/bin/bash
# Démarre le dev server Next.js, attend qu'il soit prêt, exécute les
# commandes de test passées en arguments, puis arrête le serveur.
# (Le sandbox tue les processus détachés à la fin de chaque session shell,
# donc serveur + tests doivent vivre dans le même appel.)
cd /home/z/my-project || exit 1

# Libère le port 3000 si un résidu traîne
fuser -k 3000/tcp >/dev/null 2>&1
sleep 0.5

bun run dev >> /tmp/devtest.log 2>&1 &
SERVER_PID=$!

# Attente de disponibilité (max 60 s)
for i in $(seq 1 120); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/api/categories; then
    break
  fi
  sleep 0.5
done

echo "=== SERVER READY (pid $SERVER_PID) ==="
bash -c "$*"
RC=$?

echo "=== TESTS DONE (rc=$RC) ==="
kill $SERVER_PID >/dev/null 2>&1
fuser -k 3000/tcp >/dev/null 2>&1
exit $RC

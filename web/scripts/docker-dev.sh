#!/bin/sh
# Démarrage de web dans Docker (lancé par docker-compose.yml).
set -e

# 1. Paquets : installés au premier lancement, puis à chaque changement de package-lock.json.
lock_hash="$(md5sum < package-lock.json)"
if [ "$lock_hash" != "$(cat node_modules/.installed-lock 2>/dev/null)" ]; then
  echo "Installation des paquets (premier lancement ou package-lock.json modifié)…"
  npm install --no-audit --no-fund
  echo "$lock_hash" > node_modules/.installed-lock
fi

# 2. Tables alignées sur src/server/db/schema.ts.
npm run db:push

# 3. Données de démo, seulement si la base est vide (sinon : make seed).
npm run db:seed -- --if-empty

# 4. Next.js, joignable depuis le PC.
exec npm run dev -- --hostname 0.0.0.0

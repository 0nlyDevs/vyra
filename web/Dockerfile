# Image de DÉVELOPPEMENT de web (Next.js), utilisée par docker-compose.yml.
# Le code n'est pas copié : il est monté depuis le dossier web/ ; les paquets s'installent au
# démarrage dans un volume (scripts/docker-dev.sh).
FROM node:22-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app
# Dossiers des volumes, à l'utilisateur `node` : le conteneur ne tourne pas en root, donc les
# fichiers qu'il écrit dans le dossier monté restent à vous (Linux).
RUN mkdir -p node_modules .next && chown -R node:node /app
USER node

EXPOSE 3000

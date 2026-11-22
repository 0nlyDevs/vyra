# Image de DÉVELOPPEMENT de processing (FastAPI), utilisée par docker-compose.yml.
# Le code est monté depuis le dossier processing/ ; seules les dépendances sont dans l'image.
# Après un changement de requirements*.txt : `docker compose up --build`.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    RUFF_CACHE_DIR=/tmp/ruff-cache

# ffmpeg : examen des vidéos du scan (images clés, bande son). Sans lui, l'onglet Vidéo est
# simplement indisponible.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

# Pas root : les fichiers écrits dans le dossier monté (ruff format) restent à vous (Linux).
RUN useradd --create-home --uid 1000 app
USER app

EXPOSE 8000
# --reload : rechargé à chaque modification du code. 0.0.0.0 dans le conteneur ; le port n'est
# publié que sur 127.0.0.1 côté PC (docker-compose.yml).
CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

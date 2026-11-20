# Commandes de l'équipe. `make` ou `make help` affiche la liste.
# Prérequis : Node 22, Python 3.12, Docker Desktop lancé (voir README.md).

PYTHON ?= python3.12
.DEFAULT_GOAL := help

.PHONY: help install install-web install-processing db db-push seed db-stop db-studio \
	dev dev-web dev-processing lint lint-fix typecheck test check

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: install-web install-processing ## Installe tout et crée les fichiers .env manquants

install-web:
	cd web && npm install
	@test -f web/.env.local || cp web/.env.example web/.env.local

install-processing:
	cd processing && if command -v uv >/dev/null 2>&1; then \
		uv venv -q --allow-existing --python 3.12 .venv && uv pip install -q --python .venv/bin/python -r requirements-dev.txt; \
	else \
		$(PYTHON) -m venv .venv && .venv/bin/pip install -q -r requirements-dev.txt; \
	fi
	@test -f processing/.env || cp processing/.env.example processing/.env

db: ## Lance Postgres (Docker), crée les tables et les données de démo
	docker compose up -d --wait
	$(MAKE) db-push seed

db-push: ## Aligne les tables sur web/src/server/db/schema.ts (après chaque changement du schéma)
	cd web && npm run db:push

seed: ## Remet les données de démo à zéro (comme le bouton « Réinitialiser la démo »)
	cd web && npm run db:seed

db-stop: ## Arrête Postgres (les données sont gardées)
	docker compose stop

db-studio: ## Ouvre Drizzle Studio pour voir et modifier les données
	cd web && npm run db:studio

dev: ## Lance web (port 3000) et processing (port 8000) ensemble
	$(MAKE) -j2 dev-web dev-processing

dev-web:
	cd web && npm run dev

dev-processing:
	cd processing && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

lint: ## Vérifie le style (web + processing)
	cd web && npx biome check .
	cd processing && .venv/bin/ruff check . && .venv/bin/ruff format --check .

lint-fix: ## Corrige le style automatiquement
	cd web && npx biome check --write .
	cd processing && .venv/bin/ruff check --fix . && .venv/bin/ruff format .

typecheck: ## Vérifie les types TypeScript
	cd web && npm run typecheck

test: ## Lance les tests de processing
	cd processing && .venv/bin/pytest

check: lint typecheck test ## Tout vérifier avant de pousser

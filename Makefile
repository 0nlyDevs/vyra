# Raccourcis pour Mac et Linux. Sous Windows sans `make`, taper la commande docker compose
# indiquée en commentaire (tableau complet dans README.md).
# Prérequis : Docker Desktop (ou Docker Engine sous Linux) lancé.

.DEFAULT_GOAL := help

.PHONY: help up down logs seed db-push db-generate studio check lint-fix restart-web web-local clean

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Lance tout (base, processing, web) : http://localhost:3000
	docker compose up --build

down: ## Arrête tout (les données sont gardées)
	docker compose down

logs: ## Affiche les journaux (docker compose logs -f)
	docker compose logs -f

seed: ## Remet les données de démo à zéro
	docker compose exec web npm run db:seed

db-push: ## Met les tables à jour après un changement de web/src/server/db/schema.ts
	docker compose exec web npm run db:push

db-generate: ## Écrit la migration (web/drizzle/) à committer après un changement de schema.ts
	docker compose exec web npm run db:generate

studio: ## Drizzle Studio pour voir les données : https://local.drizzle.studio
	docker compose exec web npm run db:studio

check: ## Tout vérifier avant de pousser (avec `make up` lancé)
	docker compose exec web npm run lint
	docker compose exec web npm run typecheck
	docker compose exec processing ruff check .
	docker compose exec processing ruff format --check .
	docker compose exec processing pytest

lint-fix: ## Corrige le style automatiquement
	docker compose exec web npm run lint:fix
	docker compose exec processing ruff check --fix .
	docker compose exec processing ruff format .

restart-web: ## Relance web (après un changement de .env ou si le rechargement bloque)
	docker compose restart web

web-local: ## Option : web hors Docker (Node 22 requis), base et processing dans Docker
	docker compose up -d --build db processing
	cd web && (test -f .env.local || cp .env.example .env.local) && npm install && npm run dev

clean: ## Supprime TOUT, données comprises (repartir de zéro)
	docker compose down -v

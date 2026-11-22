# Next.js (web/)

Règles de l'équipe : voir [`../AGENTS.md`](../AGENTS.md) et [`../docs/CONVENTIONS.md`](../docs/CONVENTIONS.md). Le bloc ci-dessous est géré automatiquement par Next.js.

La documentation partagée est indexée dans `../docs/README.md`. Mettre à jour les contrats API
et la démo dans la même modification que le comportement concerné. `/kit` est un catalogue local
accessible en développement uniquement ; aucun raccourci dans le parcours utilisateur.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

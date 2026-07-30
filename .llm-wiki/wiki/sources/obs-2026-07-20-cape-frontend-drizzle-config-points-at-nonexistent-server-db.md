---
type: source
title: "Observation: cape-frontend: drizzle config points at nonexistent server/db"
slug: obs-2026-07-20-cape-frontend-drizzle-config-points-at-nonexistent-server-db
status: observation
created: 2026-07-20
updated: 2026-07-20
relevance: medium
observed_at: 2026-07-20T19:14:23.111Z
tags: ["cape-frontend", "gap", "drizzle", "config"]
source_context: "Codebase analysis of cape-frontend"
---
# 🔍 Observation: cape-frontend: drizzle config points at nonexistent server/db
drizzle.config.ts references ./src/lib/server/db/schema.ts and requires DATABASE_URL, but src/lib/server/ does not exist in the tree. The frontend has no server-side database layer; drizzle appears to be scaffolding/dead config. Worth confirming with maintainers whether a server/db layer is planned. Also: routes/+page.svelte hardcodes apiBase = 'https://api.cape-dev.org/capi-dev' even though src/lib/env.ts exposes PUBLIC_API_BASE with the same default - a small inconsistency.
*Relevance: medium*

*Context: Codebase analysis of cape-frontend*

*Tags: cape-frontend gap drizzle config*
---
*Observed: 2026-07-20T19:14:23.111Z*
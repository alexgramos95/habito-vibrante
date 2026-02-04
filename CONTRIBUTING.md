# Contributing

## Package manager
Use npm only.
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`

## Commit hygiene
- One purpose per commit.
- Do not mix UI refactors with core infrastructure changes.
- Keep lockfile changes isolated when possible.

## Core change policy (manual only)
Do not modify these paths via Lovable. If you need changes there, open a PR and review carefully.

Core boundaries:
- supabase/migrations/**
- supabase/functions/**
- public/sw.js
- src/contexts/DataContext.tsx
- src/contexts/AuthContext.tsx
- src/config/push.ts
- src/integrations/supabase/**

# Architecture & Core Boundaries (Habito Vibrante)

## Goal
Keep the app stable while iterating fast with Lovable.
Lovable is great for UI/product changes, but core infrastructure must be edited manually.

## Data model (source of truth)
- FREE users: localStorage is the primary store.
- PRO/TRIAL users: localStorage remains primary (offline-first) + Supabase `user_data` acts as cloud sync/backup.

## Core boundaries (DO NOT EDIT VIA LOVABLE)
Any change in these paths must be done manually, tested locally, and committed in an isolated commit/PR.

- supabase/migrations/**
- supabase/functions/**
- public/sw.js
- src/contexts/DataContext.tsx
- src/contexts/AuthContext.tsx
- src/config/push.ts
- src/integrations/supabase/**

## Allowed via Lovable (UI/Product)
- src/pages/**
- src/components/**

## Required checks before merging core changes
- App runs locally: `npm run dev`
- Build passes: `npm run build` (recommended)
- For DB changes: migrations apply cleanly on a fresh database (Supabase CLI recommended)

## Notes
- Package manager: npm only.
- Avoid committing `.env` (use `.env.example`).

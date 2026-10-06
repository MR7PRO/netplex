# Architecture rules

- New DB schema/function changes go through drizzle migrations (`drizzle/migrations`); `supabase/migrations` is historical only. — Why: avoid two divergent migration paths.
- Region comparisons in SQL must use `public.region_key()`. — Why: user prefs store slugs, listings store Arabic names.
- Recommendations: scoring lives in the `get_recommendations` RPC; diversity and labels live in `src/lib/recommendations.ts`, not in pages. — Why: keeps the algorithm reusable and out of `Index.tsx`.
- Deal state transitions are enforced by DB triggers; `src/lib/deals.ts` only mirrors them for UI. — Why: never trust client role checks.
- Lazy routes use `lazyWithRetry`. — Why: recover from stale deployment chunks.

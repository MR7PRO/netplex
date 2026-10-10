# NetPlex — Production Baseline (Phase 4, 2026-10-06)

## Architecture map
- **Frontend:** React 18 + Vite SPA, React Router, 41 lazy pages via `lazyWithRetry` (one guarded reload on stale chunks). Single `QueryClient` with library defaults (`src/App.tsx`).
- **Auth:** `AuthContext` (email/password + Google). Role read from `user_roles`; UI gates via `ProtectedRoute`. Server truth = RLS + `has_role`/`is_admin`.
- **Data / RPCs:** `search_listings_ranked` (Search V2), `get_recommendations` (+ client diversity in `src/lib/recommendations.ts`), `listing_brand_models`, `get_price_stats`, `place_bid`, `get_seller_whatsapp`, `increment_listing_view`, `redeem_referral_code`, `validate_invite_code`, `region_key` (region normalizer).
- **Deal / dispute guards:** triggers `deals_guard_update`, `deals_auto_complete`, `disputes_mark_deal`, `notify_on_deal_change`; client mirror in `src/lib/deals.ts` (display only).
- **Edge Functions:** `netplex-ai`, `generate-description`, `image-search`, `redeem-invite`, `send-push`, `sitemap`, `mcp`. `verify_jwt=false` on 5 of them; auth is checked in code where required.
- **PWA:** manifest + `/install`; `public/push-sw.js` handles Web Push only (no offline cache).
- **Env:** `src/lib/env.ts` validation + `EnvErrorBoundary`.

## Findings
1. **Region values mismatch (fixed):** the "Near me" preference stores slugs (`gaza-city`), listings store Arabic (`غزة`, `خانيونس`). The region filter and the regional recommendation signal never matched. Both now compare through `public.region_key()`.
2. **Two migration histories:** `supabase/migrations` (37 files, through Aug 2026) and `drizzle/migrations` (0000–0007, Sep 2026 onward). Both have been applied; new changes go through drizzle only.
3. **Recommendation labels:** "trending" was used as a catch-all reason. It now needs real engagement (≥50 views or ≥5 saves); otherwise no label is shown. The regional label says "متوفر في منطقتك" because it reflects location, not popularity.
4. **Dev-only console warnings:** `forwardRef` warnings from `react-helmet-async`/`next-themes` wrappers in `App`. Not production-breaking.
5. **No TODO/FIXME** markers in `src` or `supabase/functions`; no stray `console.log` in `src`.
6. **Bundle:** build passes, with a large-chunk warning on the main bundle. Possible future improvement, not a blocker.
7. **Authenticated personalization verified (2026-10-07):** with a temporary save and follow on the signed-in account, the RPC returned `viewed_brand`, `followed_seller`, `viewed_category` and regional reasons. The saved item was excluded, and the test rows were removed afterwards. The signed-in homepage section and the region search (`/search?region=khan-younis`) render on mobile.

## Phase 5 security closure (2026-10-10)
- Fixed: protected-column guards on sellers/profiles were SECURITY DEFINER and never enforced; now SECURITY INVOKER (migration 0009). New ID-verification requests are forced to `pending`.
- Fixed: cart is now per account; guest cart cleared on sign-out.
- Verified live: admin opens /admin directly; signed-out private routes redirect to /auth; cart hidden after sign-out; phone column and ID files unreadable to non-owners.
- Open: live non-admin attack test needs a non-admin test account.

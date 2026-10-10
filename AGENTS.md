# Architecture rules

- New DB schema/function changes go through drizzle migrations (`drizzle/migrations`); `supabase/migrations` is historical only. — Why: avoid two divergent migration paths.
- Region comparisons in SQL must use `public.region_key()`. — Why: user prefs store slugs, listings store Arabic names.
- Recommendations: scoring lives in the `get_recommendations` RPC; diversity and labels live in `src/lib/recommendations.ts`, not in pages. — Why: keeps the algorithm reusable and out of `Index.tsx`.
- Deal state transitions are enforced by DB triggers; `src/lib/deals.ts` only mirrors them for UI. — Why: never trust client role checks.
- Lazy routes use `lazyWithRetry`. — Why: recover from stale deployment chunks.
- Sensitive account columns (seller verified/trust_score/user_id, profile points/referrals/role) are guarded by BEFORE triggers; only admins or SECURITY DEFINER code may change them. — Why: RLS row checks alone let owners edit their own trust fields.
- `sellers.whatsapp` has no column SELECT grant for anon/authenticated; read it only via `get_seller_whatsapp`. — Why: phone privacy.
- Private pages are wrapped in `ProtectedRoute` in `App.tsx`; AuthContext releases `loading` only after role is fetched and clears query cache/realtime/local private keys on sign-out or account switch. — Why: no flash redirects or cross-account data leaks.
- Column-guard trigger functions must be SECURITY INVOKER; inside SECURITY DEFINER `current_user` is the owner and the guard silently never fires. — Why: proven bypass fixed in migration 0009.
- The inquiry cart is stored per account (`cartStorageKey(userId)`); the guest cart is wiped on sign-out/account switch. — Why: no cart leakage between people sharing a device.

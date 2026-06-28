# بوفيه الشركة — Buffet Orders App

تطبيق موبايل لإدارة طلبات البوفيه داخل الشركة — موظفون يطلبون مشروبات، عامل البوفيه يستلم الطلبات ويعلم عليها.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (jsonwebtoken)
- DB: In-memory store (no database needed)
- Mobile: Expo + React Native + Expo Router
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated hooks & schemas (do not edit)
- `artifacts/api-server/src/lib/store.ts` — in-memory users & orders store
- `artifacts/api-server/src/lib/jwt.ts` — JWT sign/verify helpers
- `artifacts/api-server/src/routes/` — auth, orders, stats, menu route handlers
- `artifacts/mobile/app/` — all Expo screens
- `artifacts/mobile/context/AuthContext.tsx` — auth state + token management
- `artifacts/mobile/constants/colors.ts` — warm amber/gold theme tokens

## Architecture decisions

- **In-memory store**: No database provisioned — data lives in server RAM. Restarting the API server resets all orders. Good for a first build.
- **JWT auth**: Tokens stored in AsyncStorage on the device, sent as Bearer header on every API call via `setAuthTokenGetter`.
- **Worker notifications via polling**: Worker screen polls every 5 seconds for new pending orders. Haptic feedback fires when a new order arrives.
- **Role-based routing**: After login, the app redirects to `/(customer)` or `/(worker)` based on JWT role.
- **Default worker account**: `worker` / `worker123` and `admin` / `admin123` pre-seeded.

## Product

- **Customer**: Login → pick a drink from the menu → add notes → submit order → see live status in "My Orders"
- **Worker**: Login → see pending orders in real-time → tap "Delivered" to complete → view completed orders → end-of-day stats per person per item
- **Stats**: Total orders, completed, pending, breakdown by person and by item type

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Restarting the API server clears all in-memory orders and users (except pre-seeded worker accounts).
- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before using the new hooks.
- Worker accounts can be registered via the Register screen (choose "عامل بوفيه" role).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

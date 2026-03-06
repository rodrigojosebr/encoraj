# encoraj

Sistema web de gestão de encomendas para condomínios. Next.js 15, App Router, MongoDB, JWT, OCR com Gemini Flash, notificações via WhatsApp (Z-API), fotos no S3, QR Code.

See `PROJECT.md` for full context, flows, personas and data models.
See `ROADMAP.md` for development phases and milestones.

## Commands

Run from repo root (Turborepo):
```bash
yarn dev          # turbo → starts all apps
yarn build        # turbo → build all
yarn typecheck    # turbo → tsc --noEmit across all packages
yarn lint         # turbo → eslint across all packages
```

Run from `apps/encoraj/` directly:
```bash
yarn dev          # next dev
yarn seed         # tsx scripts/seed.ts
yarn panda        # panda codegen → regenerate styled-system/
```

## Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Database**: MongoDB Atlas (`mongodb` driver)
- **Auth**: JWT (`jose`) + password hashing (`bcryptjs`)
- **Validation**: Zod v4
- **Styling**: Panda CSS
- **Icons**: `lucide-react`
- **Storage**: AWS S3 (photos + QR code images) — pendente
- **OCR / AI**: Google Gemini Flash (`@google/generative-ai`) — pendente
- **WhatsApp**: Z-API — pendente
- **Language**: TypeScript strict

## Conventions

- App Router only — no Pages Router
- Use `yarn` (not npm/pnpm/bun)
- Prefer Server Components; mark client components with `'use client'`
- Validate all external input with Zod at API/server boundaries
- Keep secrets in environment variables, never hardcode
- Images from `**.amazonaws.com` are allowed via `next/image`
- Role-based access: validate role in every protected API route and page
- Soft-delete pattern: `status_id = deleted` + `deleted_at` + `deleted_by`; listagens filtram `{ status_id: (await getStatus('active'))._id }`
- Audit log: toda escrita (create/update/delete) gera documento em `audit_logs` via `lib/audit/log.ts`
- Auth redirect após login: `window.location.href = '/'` (não `router.push`)
- API auth pattern: ler `x-user-role`, `x-user-id`, `x-user-name`, `x-condo-id`, `x-condo-name` dos headers
- **Sem hardcode de labels ou opções de negócio**: nenhum mapa de tradução nem array de opções fixo no código — a fonte da verdade é o banco:
  - Labels de status/role: `getStatus(name)`, `getStatusById(id)`, `getRole(name)`, `getRoleById(id)` de `lib/db/status-map.ts` — retornam `{ _id, name, label }`; use o que precisar de cada chamada
  - Opções de `<select>` (roles, status, etc.): Server Component pai busca do banco e passa como prop `options: { value, label }[]` para o Client Component filho — o Client Component nunca conhece as opções, só as renderiza
  - Regra geral: se o dado vive no banco, ele vem do banco; se muda no banco, muda em toda a plataforma automaticamente

## Roles

- `admin` — full access: residents, users, packages, reports, settings
- `zelador` — residents CRUD
- `porteiro` — register arrivals, confirm deliveries
- `sindico` — read-only: reports and listings
- `morador` — reserved, not implemented

## Monorepo Structure

```
/                           ← git root (Turborepo workspace)
  apps/
    encoraj/                ← Next.js app
      app/
        (auth)/
          login/page.tsx
          register/page.tsx ← self-service onboarding
        (dashboard)/
          layout.tsx        ← Server Component; passa props para DashboardShell
          page.tsx
          _components/
            DashboardShell.tsx  ← Client; gerencia mobileOpen
            SidebarShell.tsx    ← Client; gerencia collapsed + mobile overlay
            MobileTopBar.tsx    ← Client; topbar fixa no mobile
            Avatar.tsx          ← iniciais com cor por hash; aceita photoUrl
            ThemeToggle.tsx     ← dark mode
            LogoutButton.tsx
          packages/
            page.tsx
            new/page.tsx        ← pendente (S3 + Gemini)
            [id]/page.tsx
          residents/
            page.tsx
            new/page.tsx
            [id]/edit/page.tsx
            _components/        ← DeleteButton, RestoreButton, DeletedToggle, WhatsAppField
          users/
            page.tsx
            new/page.tsx
            [id]/edit/page.tsx
            _components/        ← UserForm, DeleteUserButton
          settings/page.tsx     ← Client; edita nome do condo
          reports/page.tsx      ← pendente
        api/
          auth/route.ts         ← POST login, DELETE logout
          register/route.ts     ← POST cria condo + admin
          condo/route.ts        ← GET/PUT condo info
          residents/route.ts    ← GET, POST
          residents/[id]/route.ts ← PUT, DELETE (soft), PATCH (restore)
          users/route.ts        ← GET, POST
          users/[id]/route.ts   ← PUT, DELETE (soft)
          packages/route.ts     ← GET
          packages/[id]/route.ts ← GET
          packages/[id]/deliver/route.ts ← POST
          upload/route.ts       ← pendente (S3)
          ocr/route.ts          ← pendente (Gemini)
          whatsapp/route.ts     ← pendente (Z-API)
      lib/
        db/         ← MongoDB client (client.ts), collections (collections.ts), status-map.ts
        auth/       ← jwt.ts (sign/verify), cookies.ts
        audit/      ← log.ts → logAction()
        s3/         ← pendente
        gemini/     ← pendente
        zapi/       ← pendente
        qrcode/     ← pendente
      scripts/
        seed.ts     ← cria condo demo + admin inicial
      styled-system/  ← gerado por panda codegen (gitignored)
  packages/
    ui/             ← @encoraj/ui (Button, Input, Text, Badge, Spinner, FormField, Card, Alert)
    panda-config/   ← @encoraj/panda-config (tokens + recipes)
    tsconfig/       ← @encoraj/tsconfig
```

## Data Models (MongoDB)

```ts
// statuses
{ _id, name: 'active'|'inactive'|'deleted'|'arrived'|'notified'|'delivered', label, created_at }

// roles
{ _id, name: 'admin'|'zelador'|'porteiro'|'sindico'|'morador', label, status_id, created_at }

// condominiums
{ _id, name, slug, photo_url?, status_id, created_at }

// users
{ _id, condo_id, name, email, password_hash, role_id, status_id, photo_url?, created_at,
  deleted_at?, deleted_by? }

// residents
{ _id, condo_id, name, apartment, bloco?, whatsapp, status_id, created_at, created_by,
  updated_at?, updated_by?, deleted_at?, deleted_by? }

// packages
{ _id, condo_id, resident_id, code, qrcode_url, photo_url, status_id,
  arrived_at, arrived_by, notified_at?, delivered_at?, delivered_by?, notes?, created_at }

// audit_logs
{ _id, condo_id, entity, entity_id, action: 'created'|'updated'|'deleted',
  actor_id, actor_name, before?, after?, timestamp }
```

### Status/Role helpers (`lib/db/status-map.ts`)
```ts
getStatus(name)       // name → { _id, name, label }  (cacheado + cross-cache)
getStatusById(id)     // ObjectId → { _id, name, label }  (cacheado + cross-cache)
getRole(name)         // name → { _id, name, label }  (cacheado + cross-cache)
getRoleById(id)       // ObjectId → { _id, name, label }  (cacheado + cross-cache)
```

### JWT payload
```ts
{
  sub: string          // user _id
  name: string
  role: string         // slug: 'admin' | 'zelador' | 'porteiro' | 'sindico'
  condo_id: string
  condo_name: string
  photo_url?: string       // user photo (S3, pendente)
  condo_photo_url?: string // condo photo (S3, pendente)
}
```

## Responsividade

- Breakpoints: `base` (mobile-first), `md` (≥768px), `lg` (≥1024px)
- Sidebar: `SidebarShell.tsx` gerencia `collapsed` (localStorage) + mobile overlay; `DashboardShell.tsx` gerencia `mobileOpen`
- Mobile: `MobileTopBar` fixa `h=14` → `<main>` usa `pt: { base: '20', lg: '8' }`
- Desktop collapsed: `w=64px` (só ícones com tooltip); expandido: `w=220px`
- Tabelas: sempre em wrapper `overflowX: 'auto'` + `minW: '600px'` na `<table>`
- Listagens: cards em mobile (`base`), tabela em desktop (`md+`)
- Page headers: `flexWrap: 'wrap'` + `gap: '3'`
- Cards/formulários: `p: { base: '4', md: '6' }`
- Form grids: `gridTemplateColumns: { base: '1fr', md: 'Xfr Yfr' }`

## Environment Variables

```bash
# MongoDB
MONGODB_URI=

# JWT
JWT_SECRET=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Google Gemini
GEMINI_API_KEY=

# Z-API (WhatsApp)
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

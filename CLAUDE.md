# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# encoraj

Sistema web de gestão de encomendas para condomínios. Next.js 15, App Router, MongoDB, JWT, OCR com Gemini Flash, notificação por WhatsApp (link `wa.me`), fotos no S3, QR Code. Em produção na Vercel.

Docs do repo — quando ler:
- `PROJECT.md` — personas, fluxos e modelos de dados completos (antes de mexer em regra de negócio)
- `ROADMAP.md` — fases e o que falta; **Fase 10 = pendências de lançamento (segurança, LGPD, operação)**
- `STYLES.md` — design system, tokens e convenções Panda CSS (antes de mexer em UI)

## Estado atual e dívidas conhecidas

- **Não há testes automatizados nem CI.** Validação hoje é `yarn typecheck` + `yarn lint` + teste manual.
- Hardening de 17/nov/2026 aplicado (sessão revogável, token do link público, rate limits, uploads, índices). O que segue aberto está em `ROADMAP.md` → Fase 10:
  - recuperação de senha desligada ("Esqueci minha senha" comentado no login; SMTP não configurado)
  - `/register` sem verificação de email nem captcha (só rate limit por IP)
  - bucket S3 com URL pública; LGPD (política, retenção, exclusão real)
  - listagens sem paginação; sem monitoramento de erro; OCR em SDK/modelo antigos
  - sem CSP (os demais headers de segurança estão no `next.config.ts`)

## Regras de segurança (não quebrar)

- **Toda rota de API começa com `const session = await getSession()`** (`lib/auth/session.ts`) e devolve 401 se vier `null`. Não ler `x-user-*` direto em rota. Exceções públicas: `/api/auth/*` e `/api/register`.
- **Toda query leva `condo_id`** — inclusive em Server Components e inclusive no `updateOne` depois de um `findOne` já filtrado. Página que não tem o `condoId` em mãos usa `readSessionHeaders()`.
- **Nunca devolver documento inteiro**: projetar fora `password_hash`, `delivery_pin`, `public_token`.
- **Texto do usuário em `$regex` passa por `escapeRegex()`** (`lib/db/escape-regex.ts`).
- **Upload de imagem passa por `readImageUpload()`** (`lib/upload/image.ts`): limite de tamanho e formato conferido pelos bytes.
- **Email e senha usam `emailSchema` / `passwordSchema`** (`lib/auth/email.ts`): email em minúsculas, senha mínima única. Busca por email usa `EMAIL_COLLATION` (registros antigos podem ter maiúsculas).
- **Link público é `/p/{public_token}`**, nunca o `_id`. ObjectId é sequencial, não é segredo.
- **Limite que conta só falha** (login, PIN, senha atual): `isRateLimited()` antes, `checkRateLimit()` na falha.
- Índices ficam em `lib/db/indexes.ts` (criados uma vez por processo no `getDb()`), não dentro dos helpers de collection.

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
yarn typecheck    # tsc --noEmit só do app
```

`styled-system/` é gerado e gitignorado: depois de clonar ou de mexer em `packages/panda-config`, rodar `yarn panda` (o `prebuild` já faz isso no build). `yarn seed` cria statuses, roles, índices únicos e o condo demo — **nunca rodar contra o banco de produção** (cria admin com senha padrão).

## Como o request flui (auth)

1. `middleware.ts` apaga qualquer header `x-user-*`/`x-condo-*` vindo do cliente, valida o cookie `encoraj_token` (JWT, `jose`), aplica role por prefixo de **página** (`ROLE_ROUTES`) e injeta `x-user-id`, `x-user-name`, `x-user-role`, `x-condo-id`, `x-condo-name`, `x-token-iat`. Nomes vão com `encodeURIComponent` — quem lê, decodifica. `/api/*` sem token recebe 401 JSON; página recebe redirect para `/login?next=`.
2. O middleware roda no Edge e **não consulta o banco**. A revogação acontece em `getSession()`: confere no MongoDB se o usuário está ativo, no mesmo condomínio, com o mesmo role, e se o token é posterior a `password_changed_at`. O layout do dashboard chama `getSession()` e manda para `/api/auth/logout` quando falha; cada rota de API chama por conta própria.
3. `readSessionHeaders()` é a versão sem banco, para Server Components que só precisam do `condoId` (o layout já validou a sessão naquele request).
4. O middleware só protege role de páginas; **cada rota de API checa role por conta própria**.
5. Multi-tenancy é por filtro: não existe isolamento no banco. Email é único entre usuários **ativos de todos os condomínios** — a pessoa só entra em outro condomínio depois de desativada no anterior; `/register` sempre cria condomínio novo.
6. Páginas do dashboard leem o MongoDB direto (Server Components); as rotas `GET /api/*` quase não são consumidas pela UI.

## Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Database**: MongoDB Atlas (`mongodb` driver)
- **Auth**: JWT (`jose`) + password hashing (`bcryptjs`)
- **Validation**: Zod v4
- **Styling**: Panda CSS
- **Icons**: `lucide-react`
- **Storage**: AWS S3 (photos + QR code images)
- **OCR / AI**: Google Gemini Flash (`@google/generative-ai`) — modelo `gemini-2.0-flash` em `lib/gemini/ocr.ts`
- **WhatsApp**: hoje via link `wa.me` (manual); Z-API automático pendente (Fase 4b)
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
- Auth redirect após login: `window.location.href = '/'` (não `router.push`) — força reload do JWT
- Redirects pós-ação dentro do app (salvar form, confirmar entrega): usar `router.push(...)` — permite toast aparecer antes da navegação client-side
- API auth pattern: `getSession()` de `lib/auth/session.ts` (ver "Regras de segurança")
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
        p/
          [id]/page.tsx     ← pública (sem login): foto, código, QR code; delivered → "retirada"
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
            new/page.tsx        ← câmera/upload → form → S3 + QR code
            new/_components/NewPackageForm.tsx
            [id]/page.tsx       ← exibe foto + QR code
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
          reports/page.tsx      ← indicadores, filtros, timeline, export CSV
        api/
          auth/route.ts         ← POST login, DELETE logout
          auth/logout/route.ts  ← GET limpa cookie + redirect /login (sessão revogada)
          auth/forgot/route.ts  ← POST envia email de reset
          auth/reset/route.ts   ← POST valida token + redefine senha
          register/route.ts     ← POST cria condo + admin
          condo/route.ts        ← GET/PUT condo info
          residents/route.ts    ← GET, POST
          residents/[id]/route.ts ← PUT, DELETE (soft), PATCH (restore)
          users/route.ts        ← GET, POST
          users/[id]/route.ts   ← PUT, DELETE (soft)
          users/me/password/route.ts ← PUT altera senha do usuário logado
          packages/route.ts     ← GET (com busca por morador/código)
          packages/[id]/route.ts ← GET
          packages/[id]/deliver/route.ts ← POST confirmar entrega
          packages/[id]/notify/route.ts  ← POST marca notified_at + status notified
          upload/route.ts       ← POST recebe imagem → S3 → URL
          ocr/route.ts          ← POST imagem → Gemini → morador sugerido
          condo/photo/route.ts  ← POST foto do condo → S3 + DB + re-sign JWT
          users/me/photo/route.ts ← POST foto de perfil → S3 + DB + re-sign JWT
          whatsapp/route.ts     ← pendente (Z-API)
      lib/
        db/         ← client.ts, collections.ts, status-map.ts, indexes.ts, escape-regex.ts
        auth/       ← jwt.ts, cookies.ts, session.ts (getSession), rateLimit.ts, email.ts (schemas)
        upload/     ← image.ts → readImageUpload()
        audit/      ← log.ts → logAction()
        email/      ← mailer.ts (Nodemailer SMTP), templates.ts (HTML emails)
        s3/         ← client.ts (S3Client), upload.ts (uploadToS3 → URL pública)
        qrcode/     ← generate.ts (gera PNG + sobe para S3 → URL)
        gemini/     ← ocr.ts → analyzePackageLabel()
        zapi/       ← pendente (Fase 4b — Z-API automático)
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
{ _id, condo_id, name, email, password_hash, password_changed_at?, role_id, status_id, photo_url?, created_at,
  deleted_at?, deleted_by? }

// residents
{ _id, condo_id, name, apartment, bloco?, whatsapp, status_id, created_at, created_by,
  deleted_at?, deleted_by? }   // sem updated_at: histórico vive no audit_log

// packages
{ _id, condo_id, resident_id, code, delivery_pin?, public_token?, qrcode_url, photo_url, status_id,
  arrived_at, arrived_by, notified_at?, delivered_at?, delivered_by?, notes?, created_at }
// code = 'PKG-' + 6 últimos hex do _id; delivery_pin = 6 dígitos exigidos em /deliver (legados não têm)
// QR code aponta para APP_URL/packages/{id} (porteiro); morador recebe o link público /p/{public_token}

// rate_limits
{ _id, key, attempts, reset_at }   // TTL em reset_at; ver lib/auth/rateLimit.ts

// audit_logs
{ _id, condo_id, entity: 'residents'|'users'|'packages'|'condominiums', entity_id, action: 'created'|'updated'|'deleted',
  actor_id, actor_name, before?, after?, timestamp }

// password_reset_tokens
{ _id, user_id: ObjectId, token_hash: string, expires_at: Date, used_at?: Date }
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
  photo_url?: string       // user photo (S3)
  condo_photo_url?: string // condo photo (S3)
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

# Email (SMTP — Nodemailer)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# App URL (usado no QR code — troca para URL real em produção)
APP_URL=https://seudominio.com

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
# Estrutura S3: condos/{condo_id}/packages/photos/{uuid}.jpg
#               condos/{condo_id}/packages/qrcodes/{package_id}.png
#               condos/{condo_id}/users/{user_id}/avatar.jpg  ← futuro
#               condos/{condo_id}/logo.jpg                    ← futuro

# Google Gemini
GEMINI_API_KEY=

# Z-API (WhatsApp)
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

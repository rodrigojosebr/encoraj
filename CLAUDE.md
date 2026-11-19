# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# encoraj

Sistema web de gestão de encomendas para condomínios. Next.js 15, App Router, MongoDB, JWT, OCR com Gemini Flash, notificação por WhatsApp (link `wa.me`), fotos no S3, QR Code. Em produção na Vercel.

Docs do repo — quando ler:
- `PROJECT.md` — personas, fluxos e modelos de dados completos (antes de mexer em regra de negócio)
- `ROADMAP.md` — fases e o que falta; **Fase 10 = pendências de lançamento**; **Fase 11 = plano de atualização dos majors** (ler antes de subir qualquer dependência de major)
- `STYLES.md` — design system, tokens e convenções Panda CSS (antes de mexer em UI)

## Estado atual e dívidas conhecidas

- **Testes: vitest** em `apps/encoraj/tests/` (unidade + integração das rotas com MongoDB em memória). Não há teste ponta a ponta (decisão: sem Playwright) — páginas (Server Components) e `/p/[id]` são validadas por teste manual.
- Hardening de 17/nov/2026 aplicado (sessão revogável, token do link público, rate limits, uploads, índices). O que segue aberto está em `ROADMAP.md` → Fase 10:
  - recuperação de senha: backend pronto e testado; o link "Esqueci minha senha" segue comentado no login até o SMTP estar configurado em produção
  - bucket S3 ainda público na AWS (o código já serve tudo por link assinado — falta fechar o bucket); textos legais sem revisão jurídica e sem `LEGAL_CONTACT_EMAIL` definido
  - backup do banco; OCR no SDK antigo (`@google/generative-ai`) — o modelo é trocável por `GEMINI_MODEL`
  - CSP está em modo relatório (`Content-Security-Policy-Report-Only` no `next.config.ts`): só avisa no console; falta validar no navegador e ativar

## Regras de segurança (não quebrar)

- **Toda rota de API começa com `const session = await getSession()`** (`lib/auth/session.ts`) e devolve 401 se vier `null`. Identidade nunca vem de header. Exceções públicas: `/api/auth/*` e `/api/register`.
- **Toda query leva `condo_id`** — inclusive em Server Components e inclusive no `updateOne` depois de um `findOne` já filtrado. Página pega o `condoId` de `readSession()`.
- **Nunca devolver documento inteiro**: projetar fora `password_hash`, `delivery_pin`, `public_token`.
- **Texto do usuário em `$regex` passa por `escapeRegex()`** (`lib/db/escape-regex.ts`).
- **Foto é reduzida no navegador antes de subir**: `compressImage()` em `app/(dashboard)/_lib/compress-image.ts` (a Vercel recusa corpo acima de ~4,5 MB).
- **Upload de imagem passa por `readImageUpload()`** (`lib/upload/image.ts`): limite de tamanho e formato conferido pelos bytes.
- **Email e senha usam `emailSchema` / `passwordSchema`** (`lib/auth/email.ts`): email em minúsculas, senha mínima única. Busca por email usa `EMAIL_COLLATION` (registros antigos podem ter maiúsculas).
- **URL de imagem só sai assinada**: no banco (e no JWT) fica a URL canônica; tudo que entrega imagem ao navegador passa por `signS3Url()` (`lib/s3/sign.ts`). Nunca mandar `photo_url`/`qrcode_url` cru para o cliente.
- **Link público é `/p/{public_token}`**, nunca o `_id`. ObjectId é sequencial, não é segredo.
- **Limite que conta só falha** (login, PIN, senha atual): `isRateLimited()` antes, `checkRateLimit()` na falha.
- **Listagem é paginada**: `paginate()` / `parsePage()` de `lib/pagination.ts` + `<Pagination>`; nada de `find().toArray()` sem `limit`. Componente que muda filtro apaga o `page` da URL.
- **Filtro de encomendas é um só**: `buildPackageFilter()` em `lib/packages/filter.ts` serve `/packages`, `/reports` e o export CSV (`GET /api/reports/export`, todas as páginas, teto de 10 mil linhas).
- **Relatório gerencial** (`/reports/management`): todo número sai de `getManagementReport()` em `lib/reports/management.ts` — página e export CSV usam a mesma função. Datas, dia da semana e hora sempre via `tzParts()` (fuso de São Paulo). Indicador novo entra lá, com teste.
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
yarn preflight    # confere o banco antes de lançar (somente leitura; aceita MONGODB_URI=<produção>)
yarn typecheck    # tsc --noEmit do app + dos testes (tsconfig.test.json)
yarn test                                        # vitest run (suíte inteira)
yarn vitest run tests/integration/users.test.ts  # um arquivo
yarn vitest run -t "rate limit"                  # por nome do teste
yarn test:coverage                               # cobertura de lib/, app/api/ e middleware.ts
```

Testes (`tests/`): `helpers/setup.ts` sobe o ambiente (Mongo em memória via `mongodb-memory-server`, mock de `next/headers` e do cliente S3); `helpers/factory.ts` cria condomínio/usuário/morador/encomenda e faz `loginAs(user)`. Rotas são chamadas direto (`POST(jsonRequest(...), routeCtx(id))`). **Rota protegida nova entra na tabela de `tests/helpers/routes.ts`** — ela alimenta `guards.test.ts` (401 sem sessão, 403 por role) e `errors.test.ts` (erro interno vira 500 sem vazar detalhe). `yarn test:coverage` falha abaixo do piso definido em `vitest.config.mts`. O CI (`.github/workflows/ci.yml`) roda typecheck, lint e `test:coverage` em todo PR e em push na `main`. `tests/` fica fora do `tsconfig.json` principal para não entrar no `next build`.

`styled-system/` é gerado e gitignorado: depois de clonar ou de mexer em `packages/panda-config`, rodar `yarn panda` (o `prebuild` já faz isso no build). `yarn seed` cria statuses, roles, índices únicos e o condo demo — **nunca rodar contra o banco de produção** (cria admin com senha padrão).

## Documentos legais e retenção

- `/termos` e `/privacidade` são públicas (`app/(legal)/`). Identificação de quem opera e canal de contato vêm de `LEGAL_COMPANY_NAME`, `LEGAL_COMPANY_DOC`, `LEGAL_CONTACT_EMAIL` — nada fixo no código.
- **Mudou o texto? Atualizar `TERMS_VERSION` em `lib/legal/terms.ts`.** O cadastro exige o aceite e grava `terms_accepted_at` + `terms_version` no admin.
- **Não existe exclusão automática por prazo.** Dado pessoal só sai a pedido do titular ou do condomínio, pelas rotas abaixo. A Política de Privacidade afirma isso — não criar job de limpeza sem mudar o texto.
- Mudou o que é coletado, com quem é compartilhado ou por quanto tempo fica? A Política de Privacidade tem que mudar junto.

## Remoção definitiva (LGPD)

Para atender pedido de exclusão do titular. **Só admin** (nem síndico), **sem botão na interface** — é chamada pelo dev, com a sessão de um admin do condomínio. Diferente do soft-delete: apaga do banco e do S3 e não tem volta. Lógica em `lib/lgpd/erase.ts`.

| Rota | Corpo | O que apaga |
|---|---|---|
| `DELETE /api/residents/{id}/erase` | `{ "confirm": "APAGAR DEFINITIVAMENTE" }` | cadastro do morador; foto, QR code, observações, PIN e link público das encomendas dele; conteúdo dos audit logs. As encomendas ficam, anônimas |
| `DELETE /api/users/{id}/erase` | `{ "confirm": "APAGAR DEFINITIVAMENTE" }` | cadastro, avatar e links de senha do usuário; nos logs o nome vira "Usuário removido". Não remove a si mesmo |
| `DELETE /api/condo/erase` | `{ "confirm": "<nome exato do condomínio>", "password": "<senha do admin>" }` | o condomínio inteiro: pasta no S3, encomendas, moradores, usuários, audit logs |

Como chamar: logado como admin no navegador, no console — `await fetch('/api/residents/<id>/erase', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'APAGAR DEFINITIVAMENTE' }) }).then(r => r.json())`.

## Como o request flui (auth)

1. `middleware.ts` (Edge, sem banco) é só a primeira barreira: valida o cookie `encoraj_token` (JWT, `jose`), aplica role por prefixo de **página** (`ROLE_ROUTES`), devolve 401 JSON para `/api/*` sem token e redirect para `/login?next=` nas páginas. **Não injeta identidade em header** — e apaga qualquer `x-user-*`/`x-condo-*` que o cliente mande.
2. A identidade vem sempre do cookie, verificado em `lib/auth/session.ts`:
   - `getSession()` — verifica o JWT **e** confere no MongoDB se o usuário está ativo, no mesmo condomínio, com o mesmo role, e se o token é posterior a `password_changed_at`. É o que torna a sessão revogável. Usado por toda rota de API e pelo layout do dashboard (que manda para `/api/auth/logout` quando falha).
   - `readSession()` — só verifica o JWT, sem banco. Para Server Components de página, que rodam sob o layout já validado.
3. Nada depende do middleware para segurança: se ele for contornado (o Next já teve CVE disso), rota e página continuam exigindo cookie válido.
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
- **WhatsApp**: link `wa.me` aberto pelo porteiro (envio automático saiu do plano)
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
          register/page.tsx ← self-service onboarding (exige aceite dos termos)
        (legal)/
          termos/page.tsx, privacidade/page.tsx ← públicas
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
          reports/management/page.tsx ← relatório gerencial (período, picos, unidades, equipe, paradas)
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
          reports/export/route.ts ← GET CSV das encomendas (mesmos filtros de /reports)
          reports/management/export/route.ts ← GET CSV de uma seção do gerencial (?section=daily|units|staff|stalled)
          residents/[id]/erase, users/[id]/erase, condo/erase ← DELETE remoção definitiva (LGPD), só admin
          users/me/photo/route.ts ← POST foto de perfil → S3 + DB + re-sign JWT
      lib/
        db/         ← client.ts, collections.ts, status-map.ts, indexes.ts, escape-regex.ts
        auth/       ← jwt.ts, cookies.ts, session.ts (getSession/readSession), rateLimit.ts, email.ts, safe-next.ts
        text/       ← slug.ts, csv.ts
        upload/     ← image.ts → readImageUpload()
        audit/      ← log.ts → logAction()
        email/      ← mailer.ts (Nodemailer SMTP), templates.ts (HTML emails)
        s3/         ← client.ts, upload.ts (uploadToS3 → URL canônica), sign.ts (signS3Url), delete.ts
        lgpd/       ← erase.ts → eraseResident / eraseUser / eraseCondo
        packages/   ← filter.ts → buildPackageFilter()
        reports/    ← management.ts → resolvePeriod() / getManagementReport()
        qrcode/     ← generate.ts (gera PNG + sobe para S3 → URL)
        gemini/     ← ocr.ts → analyzePackageLabel()
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
{ _id, condo_id, name, email, password_hash, password_changed_at?, terms_accepted_at?, terms_version?, role_id, status_id, photo_url?, created_at,
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
GEMINI_MODEL=        # opcional; padrão gemini-2.0-flash

# Documentos legais (/termos, /privacidade)
LEGAL_COMPANY_NAME=
LEGAL_COMPANY_DOC=
LEGAL_CONTACT_EMAIL=

```

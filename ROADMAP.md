# Roadmap de Desenvolvimento — Encoraj

## Fase 0 — Fundação ✅

- [x] Definir stack técnica definitiva
- [x] Documentar arquitetura, fluxos e modelos de dados (`PROJECT.md`)
- [x] Converter para monorepo Turborepo + Yarn workspaces
- [x] Instalar e configurar Panda CSS (PostCSS + preset próprio)
- [x] Design system `@encoraj/ui` (atoms + molecules)
- [x] Estrutura de pastas inicial (`app/`, `lib/`)

---

## Fase 1 — Auth e Base ✅

- [x] Modelo `users` + `POST /api/auth` + `DELETE /api/auth`
- [x] JWT helper (`lib/auth/jwt.ts`) + middleware com proteção por role
- [x] Layout do dashboard com sidebar filtrada por role
- [x] Página `/login` com toggle mostrar/ocultar senha
- [x] Auth guard via headers `x-user-*` injetados pelo middleware
- [x] Script seed: `scripts/seed.ts`

---

## Fase 2 — Moradores ✅

- [x] Modelo `residents` com soft-delete + audit log
- [x] `GET/POST /api/residents` + `PUT/DELETE/PATCH /api/residents/[id]`
- [x] Campo `bloco` opcional no modelo e formulários
- [x] Páginas `/residents`, `/residents/new`, `/residents/[id]/edit`
- [x] Listagem: cards em mobile, tabela em desktop
- [x] Toggle "mostrar excluídos" + RestoreButton

---

## Multi-tenancy ✅

- [x] Collection `condominiums` com `slug` único
- [x] `condo_id: ObjectId` em todas as collections
- [x] `condo_id` + `condo_name` no JWT payload
- [x] Middleware injeta `x-condo-id`, `x-condo-name`, `x-user-photo`, `x-condo-photo`
- [x] Rotas isolam dados por `condo_id`

---

## Fase 3a — Encomendas (leitura/entrega) ✅

- [x] `GET /api/packages` — listagem com filtro por status + `condo_id`
- [x] `GET /api/packages/[id]` — detalhe
- [x] `POST /api/packages/[id]/deliver` — confirmar retirada
- [x] Página `/packages` — listagem com badge de status, filtros e busca por nome/código
- [x] Página `/packages/[id]` — detalhe + botão "Confirmar Entrega"

---

## Fase 6 — Gestão de Usuários ✅

- [x] `GET/POST /api/users` + `PUT/DELETE /api/users/[id]`
- [x] Páginas `/users`, `/users/new`, `/users/[id]/edit`
- [x] Listagem: cards mobile, tabela desktop; seções Ativos / Desativados
- [x] Proteção: admin não pode desativar a própria conta
- [x] Email único globalmente entre usuários ativos (soft-delete libera o slot)

---

## Fase 8 — Onboarding de Condomínio ✅

- [x] Página pública `/register`
- [x] `POST /api/register` — cria condo + admin + login automático
- [x] Slug auto-gerado com sufixo numérico se duplicado
- [x] Link "Criar conta" no login / "Já tem conta?" no register

---

## Layout e UX ✅

- [x] Sidebar colapsável: expandido (220px) / recolhido (64px, só ícones)
- [x] Mobile: `MobileTopBar` fixa + overlay com backdrop
- [x] Estado `collapsed` persistido em `localStorage`
- [x] Dark mode: `ThemeToggle` + `_dark` variants em todas as páginas
- [x] `Avatar` com iniciais + cor gerada pelo nome (pronto para `photo_url`)
- [x] Sidebar: avatar do condo (xl, centralizado) + avatar do usuário no rodapé
- [x] Toast system: `success | error | warning | info`, top-right, tamanho grande

---

## Configurações do Condomínio ✅ (foto pendente de S3)

- [x] `GET/PUT /api/condo` — lê e atualiza nome; re-assina JWT na hora
- [x] `CondominiumDoc.photo_url?` + `UserDoc.photo_url?` no modelo
- [x] `JwtPayload`: `photo_url?` + `condo_photo_url?` prontos para S3
- [x] Página `/settings` com formulário de nome + placeholder de foto
- [ ] **Pendente (S3)**: upload de foto do condomínio + foto de perfil do usuário

---

## Fase 7 — Relatórios ✅

**Objetivo**: Admin e síndico têm visibilidade completa do sistema.

- [x] Página `/reports` — indicadores: total hoje, em aberto, retiradas hoje
- [x] Tabela de encomendas com filtros: status, data, residente
- [x] Timeline por encomenda: chegada → notificação → retirada (dots coloridos com tooltip)
- [x] Exportação CSV (client-side, BOM UTF-8 para Excel)

**Milestone**: Síndico vê relatório completo com filtros e indicadores.

---

## Fase 5 — Auth Avançada ✅

**Objetivo**: Usuário consegue recuperar e alterar senha de forma autônoma.

- [x] `lib/email/mailer.ts` — Nodemailer SMTP configurável por env vars
- [x] `lib/email/templates.ts` — template HTML do email de reset
- [x] Collection `password_reset_tokens` — token (hash SHA-256), user_id, expires_at (TTL 1h), used_at
- [x] Collection `rate_limits` — key, attempts, reset_at (TTL) — MongoDB-based para Vercel serverless
- [x] `POST /api/auth/forgot` — busca usuário por email (todos os condos), gera token, envia email; sempre retorna 200
- [x] `POST /api/auth/reset` — valida hash + expiração + used_at; atualiza senha; marca used_at
- [x] `PUT /api/users/me/password` — altera senha estando logado (valida senha atual)
- [x] Rate limiting: login (5 tentativas/15min por IP), forgot (3/email/1h — silencioso)
- [x] Página pública `/forgot-password` — formulário de email
- [x] Página pública `/reset-password?token=...` — formulário de nova senha com eye toggle
- [x] Página `/profile` — exibe dados do usuário; botão de alterar senha; admin vê link "Editar"
- [x] "Meu perfil" na sidebar (todos os roles) com ícone UserCircle
- [x] Link "Esqueci minha senha" no login — **comentado; descomentar quando SMTP configurado**
- [x] Busca de encomendas: nome do morador ou código no `/packages`

**Milestone**: Porteiro esqueceu a senha → recebe email → redefine → acessa. Usuário logado altera a própria senha sem depender do admin.

---

## Fase 9 — Polimento e Produção ✅

- [x] Tratamento de erros padronizado em todas as rotas
- [x] Loading skeletons em todas as páginas do dashboard
- [x] Error boundary (`error.tsx`) + página 404 (`not-found.tsx`)
- [x] PWA: `manifest.ts` + ícones estáticos + `@ducanh2912/next-pwa` (Service Worker)
- [x] Botão "Instalar app" na sidebar (Android nativo + iOS com instrução)
- [ ] Deploy na Vercel + variáveis de ambiente de produção
- [ ] Descomentar link "Esqueci minha senha" após configurar SMTP

---

## Fase 3b — Registro de Encomendas completo ← S3 parcialmente implementado

- [x] `lib/s3/client.ts` + `lib/s3/upload.ts` — upload, URL pública
- [x] `lib/qrcode/generate.ts` — gerar PNG + upload para S3
- [x] `POST /api/upload` — recebe imagem → S3 → URL
- [x] `POST /api/packages` — criar encomenda com foto + QR code + audit log
- [x] Página `/packages/new` — câmera/upload → form manual → salvar
- [x] Página `/packages/[id]` — exibe foto da etiqueta + QR code
- [x] Estrutura S3: `condos/{condo_id}/packages/photos/` + `condos/{condo_id}/packages/qrcodes/`
- [x] QR code contém URL `APP_URL/packages/{id}` — escanear abre direto a encomenda
- [x] `APP_URL` em env vars — troca para URL real em produção (Vercel)
- [ ] `lib/gemini/ocr.ts` — OCR: enviar imagem, extrair `{ name, apartment }` ← Fase 3c
- [ ] `POST /api/ocr` — URL de imagem → Gemini → JSON ← Fase 3c
- [ ] OCR integrado ao `/packages/new` — preenche morador automaticamente ← Fase 3c
- [x] **Bonus S3**: foto do condo (`POST /api/condo/photo`) + foto de perfil (`POST /api/users/me/photo`)
- [x] **Bonus JWT**: re-assina com `photo_url` e `condo_photo_url` após upload — sidebar atualiza sem reload

**Fluxo QR code**: porteiro registra → sistema gera QR code → WhatsApp envia ao morador → morador apresenta QR (ou código) na retirada → porteiro escaneia → confirma entrega.

**Milestone**: Porteiro fotografa etiqueta, seleciona destinatário, QR code gerado e pronto para envio via WhatsApp.

---

## Fase 4a — Notificação WhatsApp via link (wa.me) ✅

- [x] Botão "Notificar via WhatsApp" na página `/packages/[id]`
- [x] Abre `wa.me/{numero}?text=...` com mensagem pronta (nome, código, link público)
- [x] `POST /api/packages/[id]/notify` — marca `notified_at` + status `notified`
- [x] Página pública `/p/[id]` — sem login, mostra foto, código, QR code, dados do destinatário
- [x] Status `delivered` → banner verde "✅ Retirada em [data]" + todos os dados visíveis; código e QR somem
- [x] Acesso por ObjectId (24 hex chars = token implícito, impossível de adivinhar)
- [x] Middleware libera `/p/` como rota pública
- [x] `/packages/[id]` — banner verde quando entregue, deixa status claro
- [x] `NotifyButton` — diferencia 1ª notificação ("Notificar via WhatsApp") de reenvio ("Notificado em [data] · Reenviar")

**Milestone**: Porteiro clica → WhatsApp abre com mensagem pronta → morador abre link → vê foto + código + QR → apresenta na portaria.

---

## Fase 4b — Notificação WhatsApp automática ← requer Z-API ou Evolution API

- [ ] `lib/zapi/` — enviar mensagem de texto e imagem via API
- [ ] `POST /api/whatsapp` — template de mensagem para o morador
- [ ] Integrar ao fluxo de criação de encomenda → atualizar `notified_at` automaticamente
- [ ] Substituir botão da Fase 4a por envio automático

**Obs**: Z-API (~R$50-150/mês) ou Evolution API (gratuita, self-hosted). Implementar após deploy em produção com uso real.

**Milestone**: Morador recebe WhatsApp automaticamente com foto, código e QR Code.

---

## Variáveis de Ambiente

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

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
- [x] `Avatar` com iniciais + cor gerada pelo nome + suporte a `photo_url`
- [x] Sidebar: avatar do condo (xl, centralizado) + avatar do usuário no rodapé
- [x] Toast system: `success | error | warning | info`, top-right, tamanho grande
- [x] `ConfirmDialog` em `@encoraj/ui` — substitui `window.confirm()` em todo o app
- [x] Badge redesign: pill colorido por status (azul/âmbar/verde/cinza), sem ponto, compacto
- [x] Ícones nos botões de ação: Eye (ver), Pencil (editar), Trash2 (excluir), RotateCcw (restaurar)
- [x] Cards mobile em `/packages` e dashboard home (base: cards, md+: tabela)
- [x] `?next=` no redirect de login — porteiro escaneia QR → login → vai direto à encomenda
- [x] Fotos de sidebar atualizadas em tempo real via custom DOM events (sem reload)
- [x] Nome do condomínio decodificado no header (decodeURIComponent)

---

## Configurações do Condomínio ✅

- [x] `GET/PUT /api/condo` — lê e atualiza nome; re-assina JWT na hora
- [x] Página `/settings` com formulário de nome + upload de foto do condo
- [x] `POST /api/condo/photo` — foto do condo → S3 + DB + re-sign JWT (`condo_photo_url`)
- [x] `DELETE /api/condo/photo` — remove foto do condo + re-sign JWT sem `condo_photo_url`
- [x] Sidebar e MobileTopBar atualizam foto do condo via `condo-photo-updated` event

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
- [x] Página `/profile` — exibe dados do usuário; upload de foto de perfil; botão de alterar senha; admin vê link "Editar"
- [x] `POST /api/users/me/photo` — foto de perfil → S3 + DB + re-sign JWT (`photo_url`)
- [x] `DELETE /api/users/me/photo` — remove foto de perfil + re-sign JWT sem `photo_url`
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
- [x] `prebuild` script: `panda codegen` roda antes do `next build` na Vercel
- [x] Next.js 15.5.12 (backport com fix do CVE-2025-66478)
- [ ] Deploy na Vercel + variáveis de ambiente de produção
- [ ] Descomentar link "Esqueci minha senha" após configurar SMTP

---

## Fase 3b — Registro de Encomendas completo ✅

- [x] `lib/s3/client.ts` + `lib/s3/upload.ts` — upload, URL pública
- [x] `lib/qrcode/generate.ts` — gerar PNG + upload para S3
- [x] `POST /api/upload` — recebe imagem → S3 → URL
- [x] `POST /api/packages` — criar encomenda com foto + QR code + audit log
- [x] Página `/packages/new` — câmera/upload → form manual → salvar
- [x] Página `/packages/[id]` — exibe foto da etiqueta + QR code
- [x] Estrutura S3: `condos/{condo_id}/packages/photos/` + `condos/{condo_id}/packages/qrcodes/`
- [x] QR code contém URL `APP_URL/packages/{id}` — escanear abre direto a encomenda
- [x] `APP_URL` em env vars — troca para URL real em produção (Vercel)

**Fluxo QR code**: porteiro registra → sistema gera QR code → WhatsApp envia ao morador → morador apresenta QR na retirada → porteiro escaneia → confirma entrega.

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

## Fase 3c — OCR com Gemini Flash ✅

- [x] `lib/gemini/ocr.ts` — envia imagem para Gemini Flash com lista de moradores do condo; retorna `{ resident_id, confidence, extracted_text }`
- [x] `POST /api/ocr` — recebe imagem (multipart), busca moradores do condo no DB, chama Gemini, valida que o `resident_id` retornado pertence ao condo
- [x] Integrar ao `/packages/new` — OCR dispara automaticamente ao selecionar a foto; spinner overlay durante análise
- [x] Confirmação obrigatória: alta/média confiança → card azul "Confirmar / Não é este"; baixa confiança → select manual direto
- [x] Fallback silencioso: timeout 15s ou erro → select manual; nunca bloqueia o fluxo
- [x] PIN de retirada (`delivery_pin`, 6 dígitos numéricos) gerado ao criar encomenda
- [x] `POST /api/packages/[id]/deliver` — valida PIN antes de confirmar entrega; pacotes legados (sem PIN) continuam funcionando
- [x] `DeliverButton` — dialog com input numérico grande; porteiro digita o código que o morador apresenta
- [x] Mensagem WhatsApp inclui `delivery_pin`; página pública `/p/[id]` exibe o PIN ao morador
- [x] Foto da etiqueta exibida com `object-fit: contain` (etiqueta inteira visível, sem corte)

**Milestone**: Porteiro fotografa etiqueta → sistema identifica destinatário → porteiro confirma → morador recebe PIN via WhatsApp → apresenta na retirada → porteiro valida.

---

## Fase 4b — Notificação WhatsApp automática 🔜

- [ ] `lib/zapi/` — enviar mensagem de texto e imagem via Z-API
- [ ] `POST /api/whatsapp` — template de mensagem para o morador
- [ ] Integrar ao fluxo de criação de encomenda → atualizar `notified_at` automaticamente
- [ ] Substituir botão da Fase 4a por envio automático (botão vira "Reenviar")

**Obs**: Z-API (~R$50-150/mês) ou Evolution API (gratuita, self-hosted). Implementar após deploy em produção.

**Modelo de negócio**: Z-API automático é a feature do plano pago. Plano gratuito usa o botão manual (wa.me) — porteiro clica, WhatsApp abre com mensagem pronta.

**Milestone**: Morador recebe WhatsApp automaticamente com foto, código e QR Code ao registrar encomenda.

---

## Foto do Pacote (opcional, futuro) 💡

**Contexto**: Além da foto da etiqueta (obrigatória, usada para OCR), o porteiro poderia tirar uma segunda foto do pacote/caixa para o morador ver o estado e tamanho antes de descer.

**Decisão atual**: não implementar — aumenta o atrito no fluxo do porteiro e o ganho é marginal para o caso de uso principal.

**Impacto estimado quando revisitar**:
- `PackageDoc` → `package_photo_url?: string`
- `POST /api/packages` → aceita campo opcional
- `/packages/new` → segunda seção opcional pós-etiqueta (mesma lógica de câmera/upload)
- `/packages/[id]` e `/p/[id]` → exibem segunda foto se existir
- S3 → mesma estrutura, segundo arquivo na mesma pasta

---

## Deploy em Produção ✅

- [x] Criar projeto na Vercel + conectar repositório
- [x] Configurar variáveis de ambiente de produção (MongoDB, JWT, S3, Gemini, SMTP)
- [x] Definir `APP_URL` com URL real da Vercel
- [ ] Descomentar link "Esqueci minha senha" no login (quando SMTP configurado)
- [x] Testar fluxo completo em produção (registro → notificação → retirada)
- [ ] Configurar domínio customizado (opcional)

---

## Variáveis de Ambiente

```bash
# MongoDB
MONGODB_URI=

# JWT
JWT_SECRET=

# App URL (QR code aponta para esta URL)
APP_URL=https://seudominio.com

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

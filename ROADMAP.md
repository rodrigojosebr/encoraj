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
- [x] Página `/packages` — listagem com badge de status e filtros
- [x] Página `/packages/[id]` — detalhe + botão "Confirmar Entrega"

---

## Fase 6 — Gestão de Usuários ✅

- [x] `GET/POST /api/users` + `PUT/DELETE /api/users/[id]`
- [x] Páginas `/users`, `/users/new`, `/users/[id]/edit`
- [x] Listagem: cards mobile, tabela desktop; seções Ativos / Desativados
- [x] Proteção: admin não pode desativar a própria conta; email único por condo

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

## Fase 3b — Registro de Encomendas completo ← requer S3 + Gemini

- [ ] `lib/s3/` — upload de arquivo, URL pública
- [ ] `lib/gemini/` — OCR: enviar imagem, extrair `{ name, apartment }`
- [ ] `lib/qrcode/` — gerar PNG + upload para S3
- [ ] `POST /api/upload` — recebe imagem → S3 → URL
- [ ] `POST /api/ocr` — URL de imagem → Gemini → JSON
- [ ] `POST /api/packages` — criar encomenda com foto + QR code
- [ ] Página `/packages/new` — câmera/upload → OCR → confirmar → salvar
- [ ] **Bonus**: foto do condo e foto de perfil do usuário (`PUT /api/condo`, `PUT /api/me`)

**Milestone**: Porteiro fotografa etiqueta, sistema identifica destinatário, QR code gerado.

---

## Fase 4 — Notificação WhatsApp ← requer Z-API

- [ ] `lib/zapi/` — enviar mensagem de texto e imagem
- [ ] `POST /api/whatsapp` — template de mensagem para o morador
- [ ] Integrar ao fluxo de criação de encomenda → atualizar `notified_at`

**Milestone**: Morador recebe WhatsApp com foto, código e QR Code.

---

## Fase 9 — Polimento e Produção

- [ ] Tratamento de erros padronizado em todas as rotas
- [ ] Loading states e feedback visual nas ações críticas
- [ ] Deploy na Vercel + variáveis de ambiente de produção
- [ ] **PWA**: `manifest.json` + ícones + `next-pwa` (Service Worker)

---

## Variáveis de Ambiente

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

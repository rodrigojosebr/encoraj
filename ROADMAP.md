# Roadmap de Desenvolvimento — Encoraj

## Fase 0 — Fundação ✅

**Objetivo**: Projeto estruturado, pronto para começar a codar.

- [x] Definir stack técnica definitiva
- [x] Documentar arquitetura, fluxos e modelos de dados (`PROJECT.md`)
- [x] Atualizar `CLAUDE.md` com stack, convenções e estrutura
- [x] Converter para monorepo Turborepo + Yarn workspaces
- [x] Instalar e configurar Panda CSS (PostCSS + preset próprio)
- [x] Design system `@encoraj/ui` (atoms + molecules)
- [x] Configurar variáveis de ambiente (`.env.local.example`)
- [x] Estrutura de pastas inicial (`app/`, `lib/`)

**Milestone**: `yarn dev` sobe, Panda CSS funciona, login no ar. ✅

---

## Fase 1 — Auth e Base ✅

**Objetivo**: Sistema de login funcional com proteção por role.

- [x] Modelo `users` no MongoDB + índice único em `email`
- [x] `POST /api/auth` — login com email/senha, retorna JWT cookie httpOnly
- [x] `DELETE /api/auth` — logout (limpa cookie)
- [x] JWT helper: gerar, verificar, extrair payload (`lib/auth/jwt.ts`)
- [x] Middleware de autenticação (`middleware.ts`) com proteção por role
- [x] Layout do dashboard com sidebar filtrada por role
- [x] Página de login (`/login`)
- [x] Auth guard no layout do dashboard via headers `x-user-*`
- [x] Script seed: criar usuário admin inicial (`scripts/seed.ts`)
- [ ] Pendente: rodar seed após configurar MongoDB Atlas

**Milestone**: Login no ar, dashboard protegido por role. ✅ (MongoDB pendente do usuário)

---

## Fase 2 — Moradores ✅

**Objetivo**: Admin consegue gerenciar o cadastro de moradores.

- [x] Modelo `residents` no MongoDB (soft delete: `active`, `deleted_at`, `deleted_by`)
- [x] `GET /api/residents` — listar com busca por nome e apartamento
- [x] `POST /api/residents` — criar morador
- [x] `PUT /api/residents/[id]` — editar
- [x] `DELETE /api/residents/[id]` — desativar (soft delete)
- [x] Audit log: toda escrita gera entrada em `audit_logs` via `lib/audit/log.ts`
- [x] Página `/residents` — listagem com busca
- [x] Página `/residents/new` — formulário de criação
- [x] Página `/residents/[id]/edit` — formulário de edição

**Milestone**: Admin e zelador criam, editam e desativam moradores. ✅

---

## Multi-tenancy Scaffolding ✅

**Objetivo**: Suporte a múltiplos condomínios (shared DB + `condo_id`) antes da Fase 3.

- [x] Collection `condominiums` com `slug` único
- [x] `condo_id: ObjectId` em todas as collections (`users`, `residents`, `packages`, `audit_logs`)
- [x] `condo_id` no JWT payload — middleware injeta header `x-condo-id`
- [x] Rotas de residents filtram e salvam por `condo_id` (isolamento entre tenants)
- [x] `scripts/seed.ts` cria condomínio demo e vincula admin ao `condo_id`

**Milestone**: Infraestrutura multi-tenant pronta; dados isolados por condomínio. ✅

---

## Fase 3 — Registro de Encomendas (núcleo) ← próxima

**Objetivo**: Porteiro registra chegada de encomenda com foto e OCR.

> **Decisão de implementação**: S3 e Gemini são dependências externas que requerem credenciais.
> Optamos por implementar primeiro tudo que independe delas (leitura, entrega, código),
> e deixar o registro de chegada (upload + OCR) para quando as credenciais estiverem disponíveis.

**3a — Sem dependências externas (implementar agora):**
- [ ] `lib/packages/code.ts` — gerador de código único 6 chars alfanumérico
- [ ] `GET /api/packages` — listar encomendas com filtro por status + `condo_id`
- [ ] `GET /api/packages/[id]` — detalhe da encomenda
- [ ] `POST /api/packages/[id]/deliver` — confirmar retirada (valida status, registra `delivered_at`)
- [ ] Página `/packages` — listagem com badge de status e filtros
- [ ] Página `/packages/[id]` — detalhe + botão "Confirmar Entrega"

**3b — Requer S3 + Gemini (implementar depois):**
- [ ] Configurar AWS S3 (`lib/s3`): upload de arquivo, gerar URL pública
- [ ] `POST /api/upload` — recebe imagem, salva no S3, retorna URL
- [ ] Configurar Gemini Flash (`lib/gemini`): enviar imagem, extrair JSON
- [ ] `POST /api/ocr` — recebe URL de imagem, retorna `{ name, apartment }`
- [ ] Geração de QR Code PNG (`lib/qrcode`) + upload para S3
- [ ] `POST /api/packages` — criar encomenda (valida residente, gera código+QR, salva)
- [ ] Página `/packages/new` — câmera/upload → OCR → confirmar destinatário → salvar

**Milestone**: Porteiro fotografa etiqueta, sistema identifica destinatário, encomenda registrada.

---

## Fase 4 — Notificação WhatsApp

**Objetivo**: Morador recebe WhatsApp automaticamente ao registrar encomenda.

- [ ] Configurar Z-API (lib/zapi): enviar mensagem de texto, enviar imagem
- [ ] `POST /api/whatsapp` — envia mensagem para número com template
- [ ] Template de mensagem configurável (salvo em settings ou env)
- [ ] Integrar envio ao fluxo de criação de encomenda (após salvar no MongoDB)
- [ ] Atualizar `notified_at` no registro após envio bem-sucedido

**Milestone**: Ao registrar encomenda, morador recebe WhatsApp com foto, código e QR Code.

---

## Fase 5 — Retirada de Encomenda

**Objetivo**: Porteiro confirma entrega via código ou QR Code.

- [ ] `GET /api/packages/[id]` — buscar encomenda por ID
- [ ] `GET /api/packages?code=XXXX` — buscar por código único
- [ ] `POST /api/packages/[id]/deliver` — confirmar entrega (valida status, atualiza)
- [ ] Página `/packages/[id]` — exibe detalhes + botão "Confirmar Entrega"
- [ ] Página `/packages` — listagem com filtro de status
- [ ] Componente de scan de QR Code (câmera) ou input de código

**Milestone**: Porteiro busca encomenda por código, confirma entrega, registro atualizado.

---

## Fase 6 — Gestão de Usuários

**Objetivo**: Admin gerencia porteiros e síndicos.

- [ ] `GET /api/users` — listar usuários (admin only)
- [ ] `POST /api/users` — criar usuário
- [ ] `PUT /api/users/[id]` — editar usuário
- [ ] `DELETE /api/users/[id]` — desativar usuário
- [ ] Página `/users` — listagem (admin only)
- [ ] Formulário criar/editar usuário

**Milestone**: Admin cria porteiros e síndicos, gerencia acesso.

---

## Fase 7 — Relatórios

**Objetivo**: Admin e síndico têm visibilidade completa do sistema.

- [ ] `GET /api/packages` com filtros: status, data, residente, porteiro
- [ ] Página `/reports` — tabela com filtros avançados
- [ ] Timeline por encomenda: chegada → notificação → retirada
- [ ] Indicadores: total hoje, em aberto, retiradas hoje
- [ ] Exportação CSV (opcional)

**Milestone**: Síndico vê relatório completo de encomendas com filtros.

---

## Fase 8 — Polimento e Produção

**Objetivo**: Sistema estável e pronto para uso real, instalável como app no celular.

- [ ] Tratamento de erros em todas as rotas de API (respostas padronizadas)
- [ ] Loading states e feedback visual nas ações críticas
- [ ] Validação de formulários no cliente (Zod + react-hook-form)
- [ ] Testes de fumaça dos fluxos principais
- [ ] Deploy na Vercel + configuração de variáveis de ambiente
- [ ] Seed de dados iniciais (admin + moradores de exemplo)
- [ ] Documentação de onboarding no `README.md`
- [ ] **PWA**: `manifest.json` + ícones (512/192px) + meta tags + `next-pwa` (Service Worker)
  - Porteiro instala direto pelo browser, sem App Store
  - Android: banner automático de instalação
  - iOS: menu Compartilhar → Adicionar à Tela Inicial

**Milestone**: Sistema em produção, porteiro instala como app no celular, condomínio usando.

---

## Dependências entre Fases

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4
                              ↓
                           Fase 5
                              ↓
Fase 1 → Fase 6          Fase 7 ← (Fase 5 + Fase 6)
                              ↓
                           Fase 8
```

## Variáveis de Ambiente Necessárias

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
GOOGLE_AI_API_KEY=

# Z-API (WhatsApp)
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

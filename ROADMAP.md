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
- [x] Deploy na Vercel + variáveis de ambiente de produção
- [ ] Descomentar link "Esqueci minha senha" após configurar SMTP → movido para Fase 10

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
- [x] Acesso por ObjectId como token implícito — ⚠️ **premissa incorreta**: ObjectId é sequencial (timestamp + contador), não é segredo. Corrigir na Fase 10 (P0)
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

## Fase 10 — Lançamento (hardening) 🔜

Resultado da auditoria de 17/nov/2026 (leitura de código; nada foi executado). Itens marcados foram corrigidos no mesmo dia — **falta validar com typecheck, lint e teste manual**. O produto está funcionalmente completo para o fluxo principal; o que falta para abrir a clientes reais é segurança, LGPD e operação. Ordem = prioridade.

### P0 — bloqueia o lançamento

**Verificar em produção (pode já estar quebrado)**
- [ ] Banco de produção não tem o admin do seed (`admin@encoraj.com` / senha padrão publicada no README)
- [ ] OCR ainda responde: `gemini-2.0-flash` e o SDK `@google/generative-ai` são antigos e o fallback é silencioso — se o modelo foi desligado, ninguém percebe. Migrar para `@google/genai` + modelo atual
- [ ] Foto de celular acima de ~4,5 MB passa em `/api/upload` e `/api/ocr` (limite de body da Vercel; não há compressão no cliente)
- [ ] `yarn audit` + atualizar Next.js para o patch de segurança mais recente da linha 15

**Vazamento de dados**
- [x] **Vazamento entre condomínios nas páginas**: `/residents` listava moradores de todos os condomínios; `/residents/[id]/edit` e `/users/[id]/edit` abriam registro de qualquer condomínio (faltava `condo_id` no filtro)
- [ ] Links `/p/` de encomendas anteriores ao token continuam aceitando o ObjectId enquanto não forem retiradas (compatibilidade com mensagens já enviadas)
- [x] `/p/[id]` usa ObjectId como segredo: quem tem um link consegue enumerar vizinhos e ver nome, foto da etiqueta e PIN de outros moradores (inclusive de outros condomínios). Trocar por token aleatório (`crypto.randomBytes`) em campo próprio + rate limit na rota
- [x] `GET /api/users` devolve `password_hash` (sem projeção) e inclui usuários excluídos
- [x] `GET /api/packages` e `/api/packages/[id]` devolvem `delivery_pin`; PIN gerado com `Math.random` → usar `crypto.randomInt`
- [ ] Bucket S3 público: fotos de etiqueta (nome + endereço) acessíveis por URL. Tornar privado + URL assinada, ou no mínimo confirmar que não há listagem

**Sessão e autenticação**
- [x] Sessão revogável: usuário desativado / role alterado / senha trocada continua válido por 8h. Checar `status_id` + versão de sessão no banco (no layout e nas rotas de escrita)
- [x] Open redirect no login: `?next=//evil.com` passa em `startsWith('/')`
- [ ] Recuperação de senha funcionando: configurar SMTP e descomentar o link (hoje admin que esquece a senha não tem saída). Usar `APP_URL` no link em vez do origin do request; ignorar usuários não ativos; invalidar tokens anteriores
- [x] Normalizar email para minúsculas em register/login/users + índice único parcial em `users.email`
- [ ] Conferir no banco se há email ativo duplicado entre condomínios (legado): se houver, o índice único não é criado (aparece `[indexes]` no log) e o login usa a conta mais recente cuja senha confere. Desativar a conta antiga resolve
- [x] `/api/register` com rate limit por IP (5/h)
- [ ] `/api/register` ainda sem verificação de email nem captcha (depende de SMTP / serviço externo)
- [x] Rate limit de login é só por IP e conta login bem-sucedido: portaria atrás do mesmo IP trava com 5 logins em 15 min; e não há limite por email. Contar só falhas, chave IP+email
- [x] Política de senha única (hoje mínimo 6 em register/users e 8 em reset/troca)

**LGPD (dados pessoais de moradores: nome, apartamento, WhatsApp, foto de etiqueta)**
- [ ] Política de privacidade + termos de uso, com aceite no `/register`
- [ ] Retenção: prazo para apagar foto/QR do S3 e anonimizar encomendas entregues
- [ ] Exclusão real de morador e de condomínio (hoje só soft-delete; audit log guarda o documento inteiro para sempre)

### P1 — primeira semana

- [x] Audit log em `deliver`, `notify` e troca de senha; `deliver` atômico (`updateOne` filtrando por status ≠ entregue) para evitar entrega dupla
- [x] Limite de tentativas de PIN em `/deliver`
- [x] Upload: limite de tamanho, validar tipo pelo conteúdo (magic bytes) e validar que `photo_url` de `POST /api/packages` aponta para o próprio bucket/condo
- [x] Escapar `$regex` das buscas (packages, residents, reports, `/api/residents`)
- [x] Headers de segurança no `next.config.ts` (HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) e `noindex` em `/p/`
- [ ] CSP (precisa de teste em navegador: Panda CSS, next/image, service worker)
- [x] Índices no MongoDB em `lib/db/indexes.ts`, criados uma vez por processo (saíram de dentro dos helpers de collection)
- [ ] Paginação em `/packages`, `/reports`, `/residents` (hoje `toArray()` de tudo)
- [ ] Monitoramento de erro (Sentry ou similar) + alerta; hoje só `console.error`
- [ ] Backup do MongoDB (Atlas free não tem) e teste de restauração
- [ ] Testes mínimos: isolamento entre condomínios, role por rota, fluxo registrar → notificar → retirar; CI rodando typecheck + lint + testes
- [x] CSV: neutralizar células iniciadas por `= + - @`
- [x] Middleware: limpar headers `x-user-*`/`x-condo-*` vindos do cliente nas rotas públicas; responder 401 JSON (não redirect) para `/api/*` sem token
- [x] Nome de usuário/condomínio com caractere fora de Latin-1 em header (`x-user-name`, `x-condo-name`) — confirmar que não derruba o middleware; codificar com `encodeURIComponent`

### P2 — depois de lançar

- [ ] Remover dependências sem uso (`jsonwebtoken`, `@types/jsonwebtoken`); `canvas` só serve ao `gen-icons`
- [ ] `next lint` está depreciado → migrar para ESLint CLI
- [ ] Backoffice: listar/suspender condomínios, métricas de uso
- [ ] Planos e cobrança (pré-requisito da Fase 4b como recurso pago)
- [ ] Morador com mais de um telefone / mais de um morador por apartamento
- [ ] Lembrete de encomenda parada há N dias
- [ ] Atualizar `PROJECT.md` (ainda marca OCR como pendente)

### Plano de testes (não há nenhum hoje)

Ferramentas: `vitest` + `@vitest/coverage-v8` + `mongodb-memory-server` (banco real em memória, sem mock de driver); Playwright só na etapa 4. Meta: 100% de linhas em `lib/` e `app/api/`, com threshold no CI; páginas cobertas por fluxo, não por linha.

1. **Unidade pura (sem banco)** — `escapeRegex`, `readImageUpload` (JPEG/PNG/WebP válidos, tipo forjado, arquivo grande), `emailSchema`/`passwordSchema`, `lib/date/tz.ts` (virada de dia em BRT), `jwt.ts` (assina, verifica, expira, re-sign descarta `iat`), parsing da resposta do Gemini (SDK mockado: JSON com cerca de markdown, id fora da lista, lixo). Extrair para `lib/` e testar: `toSlug`, validação do `?next=`, `csvCell`, formatadores de WhatsApp.
2. **Middleware** — rota pública passa sem identidade; header `x-user-*` forjado é apagado; `/api/*` sem token → 401; página sem token → redirect com `next`; token inválido limpa cookie; role errado → redirect; nome com acento/emoji não quebra.
3. **Integração das rotas (handler chamado direto, `next/headers` mockado, Mongo em memória)**
   - `getSession`: ativo passa; desativado, role alterado, outro condomínio e senha trocada depois do `iat` → `null`
   - **Matriz de isolamento**: para cada rota, sessão do condomínio A não lê nem altera nada do B
   - **Matriz de role**: para cada rota × role, 200/403 esperado
   - login: senha errada, limite por IP+email só em falha, sucesso zera, email com maiúscula, mesmo email ativo em dois condomínios
   - register: cria condo + admin, email duplicado, slug repetido, rate limit
   - users: unicidade de email entre condomínios, admin não se rebaixa nem se desativa, troca de senha derruba sessão, resposta sem `password_hash`
   - residents: CRUD, soft-delete, restore, busca com caractere de regex
   - packages: foto de outro bucket/condo recusada, morador inativo recusado, resposta sem PIN/token; deliver (PIN errado, limite, entrega dupla → 409, audit log); notify não "desentrega"
   - upload/OCR/fotos: S3 e Gemini mockados
   - `rateLimit`: janela, expiração, `isRateLimited`, `clearRateLimit`
4. **Fluxo ponta a ponta (Playwright)** — cadastro → morador → registrar chegada → notificar → `/p/{token}` → retirada com PIN; `/p/` com token errado → 404; `/residents` de um condomínio não mostra morador de outro.
5. **Componentes `@encoraj/ui`** — por último; baixo risco.

**Milestone**: um condomínio real pode se cadastrar sozinho sem que dados de moradores fiquem expostos e sem depender de suporte manual para recuperar acesso.

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

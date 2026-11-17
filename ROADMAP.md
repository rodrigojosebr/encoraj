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
- [ ] Banco de produção não tem o admin do seed (`admin@encoraj.com` / senha padrão publicada no README) — rodar `MONGODB_URI=<produção> yarn preflight` em `apps/encoraj` (somente leitura; também aponta email duplicado e índice ausente)
- [ ] OCR ainda responde? O fallback é silencioso — testar uma etiqueta em produção. Se o modelo foi aposentado, definir `GEMINI_MODEL` na Vercel (não precisa de deploy de código)
- [ ] Migrar o OCR para o SDK `@google/genai` — fazer junto, com a chave em mãos para testar
- [x] Foto de celular acima de ~4,5 MB: agora é reduzida no navegador (máx. 1600 px, JPEG) antes do OCR e do upload — **conferir no celular**
- [ ] **Publicar o Next 15.5.29** — a 15.5.12 em produção tem 3 falhas críticas (RCE no otimizador de imagens) e bypass de middleware. Upgrade feito e validado localmente (typecheck, lint, 339 testes); **falta comitar, fazer deploy e teste manual**
- [ ] Majors pendentes, um por vez e com a suíte de testes verde: Next 16 (o `@ducanh2912/next-pwa` está sem manutenção desde 2024 e depende de webpack — decidir substituto antes), Panda CSS 2, driver `mongodb` 7, ESLint 10, TypeScript 7, `lucide-react` 1, `dotenv` 18, `@types/node` 26

**Vazamento de dados**
- [x] **Vazamento entre condomínios nas páginas**: `/residents` listava moradores de todos os condomínios; `/residents/[id]/edit` e `/users/[id]/edit` abriam registro de qualquer condomínio (faltava `condo_id` no filtro)
- [ ] Links `/p/` de encomendas anteriores ao token continuam aceitando o ObjectId enquanto não forem retiradas (compatibilidade com mensagens já enviadas)
- [x] `/p/[id]` usa ObjectId como segredo: quem tem um link consegue enumerar vizinhos e ver nome, foto da etiqueta e PIN de outros moradores (inclusive de outros condomínios). Trocar por token aleatório (`crypto.randomBytes`) em campo próprio + rate limit na rota
- [x] `GET /api/users` devolve `password_hash` (sem projeção) e inclui usuários excluídos
- [x] `GET /api/packages` e `/api/packages/[id]` devolvem `delivery_pin`; PIN gerado com `Math.random` → usar `crypto.randomInt`
- [x] Imagens servidas por link assinado (`signS3Url`, validade de 1h) — o código já funciona com o bucket privado
- [ ] **Fechar o bucket na AWS**: ligar "Block all public access" e remover a policy de leitura pública. Fazer só depois do deploy desta versão; conferir que foto de etiqueta, QR code e avatares continuam aparecendo

**Sessão e autenticação**
- [x] Sessão revogável: usuário desativado / role alterado / senha trocada continua válido por 8h. Checar `status_id` + versão de sessão no banco (no layout e nas rotas de escrita)
- [x] Open redirect no login: `?next=//evil.com` passa em `startsWith('/')`
- [x] Recuperação de senha — backend: link usa `APP_URL`, só conta ativa recebe, pedido novo invalida o anterior, token consumido de forma atômica, limite por email e por IP, audit log
- [ ] Recuperação de senha — ligar: configurar SMTP na Vercel e descomentar o link "Esqueci minha senha" em `app/(auth)/login/page.tsx`
- [x] Normalizar email para minúsculas em register/login/users + índice único parcial em `users.email`
- [ ] Conferir no banco se há email ativo duplicado entre condomínios (legado): se houver, o índice único não é criado (aparece `[indexes]` no log) e o login usa a conta mais recente cuja senha confere. Desativar a conta antiga resolve
- [x] `/api/register` com rate limit por IP (5/h)
- [x] Rate limit de login é só por IP e conta login bem-sucedido: portaria atrás do mesmo IP trava com 5 logins em 15 min; e não há limite por email. Contar só falhas, chave IP+email
- [x] Política de senha única (hoje mínimo 6 em register/users e 8 em reset/troca)

**LGPD (dados pessoais de moradores: nome, apartamento, WhatsApp, foto de etiqueta)**
- [ ] Política de privacidade + termos de uso, com aceite no `/register`
- [ ] Retenção: prazo para apagar foto/QR do S3 e anonimizar encomendas entregues
- [x] Remoção definitiva a pedido do titular: `DELETE /api/residents/[id]/erase`, `/api/users/[id]/erase` e `/api/condo/erase` — só admin, sem botão na interface (ver CLAUDE.md)

### P1 — primeira semana

- [x] Audit log em `deliver`, `notify` e troca de senha; `deliver` atômico (`updateOne` filtrando por status ≠ entregue) para evitar entrega dupla
- [x] Limite de tentativas de PIN em `/deliver`
- [x] Upload: limite de tamanho, validar tipo pelo conteúdo (magic bytes) e validar que `photo_url` de `POST /api/packages` aponta para o próprio bucket/condo
- [x] Escapar `$regex` das buscas (packages, residents, reports, `/api/residents`)
- [x] Headers de segurança no `next.config.ts` (HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) e `noindex` em `/p/`
- [ ] CSP: já enviada em modo relatório (`Content-Security-Policy-Report-Only`). Navegar pelo app com o console aberto; sem avisos, trocar o nome do header no `next.config.ts` para ativar
- [x] Índices no MongoDB em `lib/db/indexes.ts`, criados uma vez por processo (saíram de dentro dos helpers de collection)
- [x] Paginação em `/packages`, `/reports`, `/residents` (25 por página); export CSV virou rota (`/api/reports/export`) e exporta todas as páginas do filtro
- [ ] Backup do MongoDB (Atlas free não tem) e teste de restauração
- [x] Testes de unidade e de integração das rotas (etapas 1 a 3 do plano abaixo) — 339 testes, 100% das linhas de `lib/`, `app/api/` e `middleware.ts`
- [x] CI (`.github/workflows/ci.yml`): typecheck + lint + `test:coverage` em PR e push na `main` — **ainda não rodou no GitHub**
- [ ] Testes ponta a ponta (Playwright) — única cobertura possível para as páginas e `/p/[id]`
- [x] CSV: neutralizar células iniciadas por `= + - @`
- [x] Middleware: limpar headers `x-user-*`/`x-condo-*` vindos do cliente nas rotas públicas; responder 401 JSON (não redirect) para `/api/*` sem token
- [x] Nome de usuário/condomínio com caractere fora de Latin-1 em header (`x-user-name`, `x-condo-name`) — confirmar que não derruba o middleware; codificar com `encodeURIComponent`

### P2 — depois de lançar

- [x] Remover dependências sem uso (`jsonwebtoken`, `@types/jsonwebtoken`)
- [ ] `canvas` só serve ao `gen-icons` — mover para script avulso
- [x] `next lint` → ESLint CLI (`eslint .`)
- [ ] Morador com mais de um telefone / mais de um morador por apartamento
- [ ] Lembrete de encomenda parada há N dias
- [x] Atualizar `PROJECT.md` (marcações de OCR pendente)

### Plano de testes (etapas 1 a 3 escritas em `apps/encoraj/tests/`)

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

```

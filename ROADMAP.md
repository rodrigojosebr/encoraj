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
- [ ] **Publicar o Next 15.5.29** — a 15.5.12 em produção tem 3 falhas críticas (RCE no otimizador de imagens) e bypass de middleware. Upgrade comitado no branch `dash+pwa` (typecheck, lint e 429 testes verdes); **falta teste manual, merge na `main` e deploy**
- [ ] Majors pendentes — ver **Fase 11** (plano passo a passo, um por vez)

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
- [x] Política de Privacidade (`/privacidade`) e Termos de Uso (`/termos`), com aceite obrigatório no `/register` (grava data e versão aceita)
- [ ] Definir na Vercel `LEGAL_COMPANY_NAME`, `LEGAL_COMPANY_DOC` e `LEGAL_CONTACT_EMAIL` — sem o email, os documentos não mostram canal de contato para pedidos de dados
- [ ] Passar os dois textos por revisão jurídica antes de divulgar o produto
- Retenção: **não há prazo automático** (decisão de 17/nov/2026). Dado só é removido a pedido do titular ou do condomínio, pelas rotas de remoção definitiva
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

Ferramentas: `vitest` + `@vitest/coverage-v8` + `mongodb-memory-server` (banco real em memória, sem mock de driver). Meta: 100% de linhas em `lib/` e `app/api/`, com threshold no CI; páginas cobertas por fluxo, não por linha.

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
4. **Componentes `@encoraj/ui`** — por último; baixo risco.

Sem teste ponta a ponta (decisão de 17/nov/2026: não haverá Playwright). Páginas e `/p/[id]` são validadas por teste manual.

**Milestone**: um condomínio real pode se cadastrar sozinho sem que dados de moradores fiquem expostos e sem depender de suporte manual para recuperar acesso.

---

## Relatórios gerenciais ✅ (primeira versão em 18/nov/2026)

**Objetivo**: síndico e admin tiram números para decidir — não só a lista de encomendas.

Página `/reports/management` (admin e síndico), com período livre (padrão: últimos 30 dias; atalhos de 7, 30, 90 dias e 12 meses) e export CSV por seção. Cálculo em `lib/reports/management.ts`.

- [x] **Indicadores**: chegadas, retiradas, em aberto agora, tempo médio e mediano até a retirada, % retiradas em 24h, % de moradores avisados, tempo médio até o aviso, retiradas sem aviso registrado
- [x] **Encomendas paradas**: tudo que está na portaria agora, por faixa de dias (até 2, 3–6, 7–14, 15+) e lista das mais antigas — é o que mais gera reclamação
- [x] **Volume por dia**: chegadas × retiradas
- [x] **Picos**: chegadas por dia da semana e por hora — para dimensionar a portaria
- [x] **Unidades e blocos**: quem mais recebe e quem tem encomenda acumulada (dois moradores do mesmo apto contam como uma unidade)
- [x] **Equipe**: chegadas registradas e retiradas confirmadas por usuário
- [x] Export CSV: volume diário, unidades, equipe e paradas (`GET /api/reports/management/export?section=`)

Fora do escopo (decisão de 19/nov/2026): comparação com período anterior, taxa de acerto do OCR, envio mensal por email e versão em PDF.

**Milestone**: síndico abre o relatório do mês, vê quantas encomendas chegaram, quanto tempo ficam na portaria e quais estão paradas — e leva a planilha para a assembleia.

---

## Fase 11 — Atualização dos majors 🔜

Levantamento de 18/nov/2026 (versões do registro npm). **Só começar depois que a 15.5.29 estiver estável em produção e o CI verde na `main`.** Um major por branch/PR; nunca dois juntos — se algo quebrar, tem que dar para saber qual foi.

Rede de proteção: 436+ testes cobrem `lib/`, `app/api/` e o middleware. **Páginas, visual, PWA e build não têm teste** — cada etapa abaixo lista o que conferir à mão.

| Pacote | Hoje | Alvo | Exige |
|---|---|---|---|
| `mongodb` | 6.22 | 7.9 | Node ≥ 20.19 |
| `lucide-react` | 0.577 | 1.75 | — |
| `@ducanh2912/next-pwa` | 10.2.9 (parado desde set/2024) | remover | — |
| `next` + `eslint-config-next` | 15.5.29 | 16.4 | Node ≥ 20.9 |
| `eslint` | 9.39 | 10.15 | Node ≥ 20.19 / 22.13 |
| `@pandacss/dev` | 1.12 | 2.5 — adiado | **Node ≥ 22** + projeto ESM |
| `typescript` | 5.9 | 7.0 — bloqueado | `typescript-eslint` com suporte |
| `dotenv` | 16.6 | 18.0 | — |
| `@types/node` | 24.x | **22.x** (alinhar ao Node de produção, não subir para 26) | — |

### Etapa 0 — Fixar o Node 22 (pré-requisito de tudo) — feito no repo em 19/nov/2026

Panda 2 e o SDK novo do Gemini exigem Node 22. O CI já usa 22; a máquina local está na 22.21.

- [ ] Conferir em Vercel → Settings → Build & Deployment que o projeto usa Node 22.x
- [x] Declarar `"engines": { "node": ">=22" }` no `package.json` da raiz e criar `.nvmrc` com `22`
- [x] Alinhar `@types/node` para `^22` (hoje os tipos são de uma versão mais nova que o runtime)

### Etapa 1 — `mongodb` 7 + `dotenv` 18 (risco baixo) — instalado em 19/nov/2026, falta validar

É o major mais bem coberto: os testes de integração rodam contra MongoDB de verdade.

- [x] API usada conferida contra os tipos do driver 7.9 (nada removido); o uso aqui é básico: `find`, `findOne`, `findOneAndUpdate`, `updateOne/Many`, `deleteOne/Many`, `countDocuments`, `createIndex`, `aggregate` só no `preflight`
- [x] `mongodb-memory-server` traz o próprio driver; não depende do do app
- [ ] `yarn typecheck && yarn test:coverage` — se passar, está validado
- [ ] Manual: `yarn preflight` e `yarn seed` contra o banco local (únicos usos de `dotenv`)
- **Volta atrás**: reverter o PR; nada muda no banco

### Etapa 2 — `lucide-react` 1 (risco baixo) — instalado em 19/nov/2026, falta validar

20 arquivos importam ícones. O risco conhecido de um 1.0 é nome de ícone renomeado ou alias removido.

- [x] Os 32 ícones importados existem na 1.76 com o mesmo nome (conferido nos tipos); `yarn typecheck` confirma
- [ ] Manual: passar por sidebar, botões de ação das tabelas, formulário de nova encomenda e timeline dos relatórios
- **Volta atrás**: reverter o PR

### Etapa 3 — Sair do `next-pwa` (fazer ainda no Next 15) — feito em 19/nov/2026, falta validar no aparelho

É o que destrava o Next 16: o `next-pwa` é um plugin de webpack sem manutenção, e o Next 16 usa Turbopack por padrão também no build.

Além disso, a configuração atual (`cacheOnFrontEndNav` + `aggressiveFrontEndNavCaching`) guarda no aparelho as páginas navegadas por quem está logado. Em celular de portaria compartilhado, isso é dado de morador em cache depois do logout — motivo extra para trocar.

Opções:

1. **Service worker mínimo escrito à mão** em `public/sw.js` (recomendado): só o necessário para o app ser instalável e mostrar uma tela "sem conexão"; nenhum cache de página autenticada. Zero dependência.
2. **Serwist** (`@serwist/next` 9.5 ou `@serwist/turbopack`): sucessor mantido do next-pwa, com precache. Mais uma dependência e mais configuração.
3. Manter o next-pwa e buildar com webpack no Next 16: só adia o problema.

- [x] Decidido: opção 1 — `public/sw.js` escrito à mão + `public/offline.html`, registrado por `app/_components/ServiceWorker.tsx` (só em produção)
- [x] `@ducanh2912/next-pwa` removido do `next.config.ts` e do `package.json`; `sw.js` agora é versionado
- [x] Middleware libera sem login os arquivos do PWA (`/sw.js`, `/offline.html`, manifest e ícones) — o navegador os busca sem cookie
- [x] O service worker novo é servido no mesmo endereço do antigo (substitui) e apaga, ao ativar, todo cache que não é o dele
- [x] `worker-src 'self'` na CSP continua valendo; `/sw.js` é servido sem cache
- [ ] Manual, em produção ou preview: instalar no Android (Chrome) e no iPhone (Safari → Adicionar à Tela de Início), abrir pelo ícone, fazer login, registrar encomenda; modo avião → tela de sem conexão; logout → páginas antigas não aparecem
- **Volta atrás**: reverter o PR (o SW antigo volta a ser servido)

### Etapa 4 — Next 16 + `eslint-config-next` 16 + ESLint 10 (risco médio-alto) — instalado em 19/nov/2026, falta validar

O que muda e afeta este projeto:

- **`middleware.ts` vira `proxy.ts`** (função `proxy`), rodando em Node em vez de Edge. O arquivo só usa `jose` e `NextResponse` — deve portar direto. O teste `tests/unit/middleware.test.ts` precisa apontar para o novo arquivo
- **Turbopack no build**: sem o next-pwa (etapa 3) não há mais plugin de webpack; conferir que o Panda (PostCSS) continua gerando CSS
- **`next/image`**: os padrões mudaram (qualidades aceitas, cache mínimo, bloqueio de IP local). As imagens vêm de links assinados do S3, com query string que muda a cada render — conferir que continuam aparecendo e avaliar `unoptimized` para elas
- **APIs assíncronas** (`params`, `searchParams`, `cookies()`, `headers()`): o projeto já usa todas com `await`
- **ESLint 10** não lê mais o formato antigo: o `eslint.config.mjs` usa `FlatCompat` para carregar a config do Next — trocar pela config flat nativa do `eslint-config-next` 16
- React continua na 19.x

Passos:

- [x] Ler o guia oficial de upgrade para a 16 (em `node_modules/next/dist/docs/` depois de instalar, ou no site) — **antes de escrever código**
- [x] Codemod dispensado: as únicas mudanças aplicáveis eram o rename do middleware e a config do ESLint, feitas à mão (APIs assíncronas e `next lint` já estavam migrados)
- [x] `middleware.ts` → `proxy.ts` (função `proxy`); teste e cobertura apontam para o arquivo novo
- [x] `FlatCompat` trocado pela config nativa do `eslint-config-next`; `eslint` na 10.15 (três plugins ainda avisam peer dependency de ESLint 9 — previsto na doc do Next)
- [x] Imagens do S3 com `<Image unoptimized>`: o link assinado muda a cada render e não deve passar pelo otimizador
- [ ] `yarn typecheck && yarn lint && yarn test:coverage && yarn build`
- [ ] Manual, em preview da Vercel — o roteiro completo:
  - login, logout, `?next=` depois de escanear QR, sessão revogada (desativar usuário logado)
  - cada role vê só o que pode (`/users`, `/residents`, `/packages`, `/reports`)
  - nova encomenda pelo celular: foto, OCR, registro, aviso por WhatsApp, link `/p/…`, retirada com PIN
  - imagens: foto da etiqueta, QR code, avatar, logo (sidebar, perfil, configurações, página pública)
  - paginação, busca, filtros, export CSV, relatório gerencial
  - dark mode, sidebar recolhida, mobile
  - headers de segurança e CSP no navegador
- **Volta atrás**: reverter o PR; na Vercel, "Promote" do deploy anterior resolve em segundos

### Etapa 5 — Panda CSS 2 — ADIADA (avaliada em 19/nov/2026)

Instalei a 2.5.0, li o que muda e **voltei para a 1.12**. Não é um bump: é outra arquitetura (compilador novo), com mudanças que quebram em silêncio — e nada aqui detecta regressão visual.

O que afeta este projeto, pelo levantamento (relatos de quem migrou e a issue chakra-ui/panda#3886, que lista mudanças fora do guia oficial):

- **Presets deixaram de ser injetados.** O `panda.config.ts` usa `presets: ['@pandacss/dev/presets', encorajPreset]`, e esse subpath não existe mais na v2. Sem `@pandacss/preset-base` + `@pandacss/preset-panda` declarados à mão, somem utilitários e condições (`_dark`, `_hover`) — e o build passa mesmo assim, só com aviso
- **Exige projeto ESM.** O app não tem `"type": "module"`; ligar isso mexe em `next.config.ts`, scripts e configs
- **Extração só reconhece import de `styled-system`.** O `@encoraj/ui` importa por alias (`@encoraj/styled-system/css`). Se a v2 não seguir o alias, Button, Badge, Input e cia. ficam **sem CSS, sem erro**
- **`compoundVariants` mudou de comportamento** — o `button.recipe.ts` usa (variant × intent), ou seja, todos os botões do app
- **Ordem das regras de mesma especificidade não segue mais a ordem escrita** — pode mudar qual estilo vence em casos hoje corretos

Para fazer com segurança precisa de alguém olhando a tela a cada passo. Quando for:

- [ ] Fazer em branch isolado, com o app rodando local lado a lado com produção
- [ ] Declarar os presets base explicitamente; resolver ESM; confirmar a extração do `@encoraj/ui` (ou configurar o mapeamento de import)
- [ ] Conferir **todas** as telas, claro e escuro, mobile e desktop: badges de status, botões (todas as variantes × intents), toasts, ConfirmDialog, skeletons, tabelas × cards
- [ ] Atualizar `STYLES.md`

Não há urgência: a linha 1.x segue funcionando com o Next 16 + Turbopack (validado no build de 19/nov/2026) e não tem alerta de segurança.

### Etapa 6 — TypeScript 7 — BLOQUEADA pelo ecossistema (conferido em 19/nov/2026)

O `typescript-eslint` mais recente (8.73.0, usado pelo `eslint-config-next`) declara suporte a `typescript >=4.8.4 <6.1.0`. Com a 7 o lint deixa de ser confiável.

- [ ] Reavaliar quando o `typescript-eslint` aceitar a 7 (`npm view typescript-eslint peerDependencies`)
- [ ] Passo intermediário possível: TypeScript 6.0 (dentro da faixa suportada). Atenção ao `baseUrl` do `tsconfig.json`, que a linha 6 trata como depreciado
- [ ] Na hora: `yarn typecheck`, `yarn lint`, `yarn panda`, `yarn build`, `yarn test:coverage`
- **Volta atrás**: reverter o PR; não afeta o que roda em produção

### Fora desta fase

- `react` / `react-dom`: já na última 19.x
- `@google/generative-ai` → `@google/genai`: é migração de SDK, não bump — item próprio na Fase 10

**Situação em 19/nov/2026**: etapas 0 a 4 concluídas e validadas (Node 22, mongodb 7, dotenv 18, lucide 1, next-pwa removido, Next 16, ESLint 10). Ficam para trás só Panda (adiado, risco visual) e TypeScript (bloqueado pelo lint).

**Milestone**: nenhuma dependência direta a mais de um major atrás, sem plugin abandonado no build.

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

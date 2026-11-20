# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# encoraj

Sistema web de gestão de encomendas para condomínios. Next.js 16, App Router, MongoDB, JWT, OCR com Gemini Flash, notificação por WhatsApp (link `wa.me`), fotos no S3, QR Code. Em produção na Vercel.

Docs do repo — quando ler:
- `PROJECT.md` — personas, fluxos e modelos de dados completos (antes de mexer em regra de negócio)
- `ROADMAP.md` — fases e o que falta; **"Dívida de padrão" = o que a auditoria de 19/nov/2026 deixou aberto**; **Fase 10 = pendências de lançamento**; **Fase 11 = plano de atualização dos majors** (ler antes de subir qualquer dependência de major). **O Next instalado é o 16: antes de mexer em roteamento, proxy, cache ou imagens, ler o guia em `node_modules/next/dist/docs/`**
- `STYLES.md` — design system, tokens e convenções Panda CSS (antes de mexer em UI)

## Estado atual e dívidas conhecidas

- **Testes: vitest** em `apps/encoraj/tests/` (unidade + integração das rotas com MongoDB em memória). Não há teste ponta a ponta (decisão: sem Playwright) — páginas (Server Components) e `/p/[id]` são validadas por teste manual.
- Hardening de 17/nov/2026 aplicado (sessão revogável, token do link público, rate limits, uploads, índices). O que segue aberto está em `ROADMAP.md` → Fase 10:
  - recuperação de senha: backend pronto e testado; o link "Esqueci minha senha" segue comentado no login até o SMTP estar configurado em produção
  - bucket S3 ainda público na AWS (o código já serve tudo por link assinado — falta fechar o bucket); textos legais sem revisão jurídica e sem `LEGAL_CONTACT_EMAIL` definido
  - backup do banco; telas de super admin só aparecem para quem tem a role `superadmin` (atribuída direto no banco); OCR no SDK antigo (`@google/generative-ai`) — o modelo é trocável por `GEMINI_MODEL`
  - CSP está em modo relatório (`Content-Security-Policy-Report-Only` no `next.config.ts`): só avisa no console; falta validar no navegador e ativar

## Regras de segurança (não quebrar)

- **Toda rota de API começa com `const session = await getSession()`** (`lib/auth/session.ts`), devolve `unauthorized()` se vier `null` e `forbidden()` se `!can(session, 'permissão')`.
- **Resposta de rota sai pelos helpers de `lib/api/http.ts`**: `unauthorized`, `forbidden`, `badRequest`, `notFound`, `conflict`, `tooManyRequests`, `serverError(label, err)` (registra e responde 500). Corpo JSON entra por `parseBody(request, schema)` — JSON ilegível vira 400, nunca 500. Mensagem de erro é frase, com ponto final. Não escrever `NextResponse.json({ error … })` à mão.
- **Rota existe porque a interface usa.** Páginas leem o banco direto (Server Components); não criar `GET /api/*` "para o futuro" — é porta aberta sem teste de uso. Identidade nunca vem de header. Única exceção pública: `/api/auth/*`.
- **Toda query leva `condo_id`** — inclusive em Server Components e inclusive no `updateOne` depois de um `findOne` já filtrado. Página pega o `condoId` de `readSession()`.
- **Nunca devolver documento inteiro**: projetar fora `password_hash`, `delivery_pin`, `public_token`.
- **Texto do usuário em `$regex` passa por `escapeRegex()`** (`lib/db/escape-regex.ts`).
- **Foto é reduzida no navegador antes de subir**: `compressImage()` em `app/(dashboard)/_lib/compress-image.ts` (a Vercel recusa corpo acima de ~4,5 MB). Foto de perfil e do condomínio passam por `usePhotoUpload()` (`app/(dashboard)/_lib/use-photo-upload.ts`), que já reduz e avisa a barra lateral.
- **Upload de imagem passa por `readImageUpload()`** (`lib/upload/image.ts`): limite de tamanho e formato conferido pelos bytes.
- **Email e senha usam `emailSchema` (`lib/auth/email.ts`) / `passwordSchema` + `hashPassword()` (`lib/auth/password.ts`)**: email sempre gravado e buscado em minúsculas, senha mínima única, um só custo de bcrypt. Nunca chamar `bcrypt.hash` direto. Email é único entre usuários ativos (índice parcial no banco). O mínimo de senha mora em `lib/auth/password-rules.ts` (`PASSWORD_MIN`), que a tela também lê; campo de senha é sempre `<PasswordField>` de `@encoraj/ui`.
- **URL de imagem só sai assinada**: no banco fica a URL canônica; tudo que entrega imagem ao navegador passa por `signS3Url()` (`lib/s3/sign.ts`). Nunca mandar `photo_url`/`qrcode_url` cru para o cliente.
- **Link público é `/p/{public_token}`**, nunca o `_id` (ObjectId é sequencial, não é segredo). Não há mais aceitação de link antigo por id.
- **Ninguém se cadastra sozinho**: usuário só nasce cadastrado por quem está acima (tela Usuários, ou junto com o condomínio/administradora), já dentro do condomínio. Não criar rota pública de cadastro nem lista de "usuários sem condomínio".
- **Senha definida por outra pessoa obriga a troca** (`users.must_change_password`): ligada ao cadastrar e quando alguém redefine a senha de outro; desligada só quando o dono troca (`PUT /api/users/me/password`) ou redefine pelo link do email. Enquanto ligada, `getSession()` devolve `null` — nenhuma rota atende — e o layout manda para `/change-password`. Só essa tela, a rota de troca e o layout usam `getSessionForPasswordChange()`; **não usar essa função em mais nada**. Fluxo novo que define senha de terceiro tem que ligar a marca.
- **Limite que conta só falha** (login, PIN): `isRateLimited()` antes, `checkRateLimit()` na falha. Senha atual de quem já está logado: `verifyCurrentPassword()` (`lib/auth/current-password.ts`), que já faz isso.
- **Cookie de sessão só por `setSessionCookie()` / `clearSessionCookie()`** (`lib/auth/cookies.ts`). O token leva só identidade e condomínio (ver "JWT payload") — foto e o que mais mudar à toa ficam no banco.
- **Listagem é paginada**: `paginate()` / `parsePage()` de `lib/pagination.ts` + `<Pagination>`; nada de `find().toArray()` sem `limit`. Componente que muda filtro apaga o `page` da URL.
- **Filtro de encomendas é um só**: `buildPackageFilter()` em `lib/packages/filter.ts` serve `/packages`, `/reports` e o export CSV (`GET /api/reports/export`, todas as páginas, teto de 10 mil linhas).
- **Relatório gerencial** (`/reports/management`): todo número sai de `getManagementReport()` em `lib/reports/management.ts` — página e export CSV usam a mesma função. Datas, dia da semana e hora sempre via `tzParts()` (fuso de São Paulo). Indicador novo entra lá, com teste.
- **PWA sem cache de página**: `public/sw.js` é escrito à mão (sem build) e só serve `/offline.html` quando a navegação falha. Não adicionar cache de página, API ou imagem — aparelho de portaria é compartilhado. Mudou o arquivo? Trocar `VERSION` dentro dele.
- **Erro de servidor passa por `reportError(label, err)`** (`lib/observability/report.ts`), nunca por `console.error` solto: registra no log e guarda agrupado em `error_logs` (tela `/admin/errors`). **Nada é enviado para fora do sistema.** Email, telefone, token e link assinado são mascarados antes de gravar. Erro fora de try/catch chega pelo `instrumentation.ts`; erro de tela, pelos `error.tsx` → `POST /api/client-errors`.
- **Chamada de IA deixa rastro**: toda chamada ao modelo registra modelo, resultado, tokens e tempo em `ai_usage` via `recordAiUsage()` (`lib/ai/usage.ts`) — nunca o texto lido nem a imagem. Recurso novo com IA tem que registrar também.
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
yarn typecheck    # next typegen (tipos das rotas, sem build) + tsc --noEmit do app e dos testes
yarn test                                        # vitest run (suíte inteira)
yarn vitest run tests/integration/users.test.ts  # um arquivo
yarn vitest run -t "rate limit"                  # por nome do teste
yarn test:coverage                               # cobertura de lib/, app/api/ e proxy.ts
```

Testes (`tests/`): `helpers/setup.ts` sobe o ambiente (Mongo em memória via `mongodb-memory-server`, mock de `next/headers` e do cliente S3); `helpers/factory.ts` cria condomínio/usuário/morador/encomenda e faz `loginAs(user)`. Rotas são chamadas direto (`POST(jsonRequest(...), routeCtx(id))`). **Rota protegida nova entra na tabela de `tests/helpers/routes.ts`** — ela alimenta `guards.test.ts` (401 sem sessão, 403 por role) e `errors.test.ts` (erro interno vira 500 sem vazar detalhe). `yarn test:coverage` falha abaixo do piso definido em `vitest.config.mts`. O CI (`.github/workflows/ci.yml`) roda typecheck, lint e `test:coverage` em todo PR e em push na `main`. `tests/` fica fora do `tsconfig.json` principal para não entrar no `next build`.

`styled-system/` é gerado e gitignorado: depois de clonar ou de mexer em `packages/panda-config`, rodar `yarn panda` (o `prebuild` já faz isso no build). `yarn seed` cria statuses, roles, índices únicos e o condo demo — **nunca rodar contra o banco de produção** (cria admin com senha padrão).

## Permissões: roles somadas + mapa único

- **Cada usuário tem um conjunto de roles (`users.role_ids`) e pode tudo que qualquer uma delas permite.** Não existe role principal nem herança entre roles: quem exerce dois papéis recebe as duas.
- **`lib/auth/permissions.ts` é a fonte única de "quem pode o quê"**: cada permissão (`packages.deliver`, `users.manage`…) lista as roles de condomínio que a concedem; o super admin pode todas (regra dentro de `can()`). Rotas, proxy, menu e a tela `/admin/permissions` leem daí.
- **Para autorizar, sempre `can(session, 'permissão')`.** Não escrever lista de roles em rota, página ou componente. Permissão nova entra no mapa, com teste: `tests/unit/permissions.test.ts` tem a matriz inteira escrita à mão e `tests/helpers/routes.ts` confere rota por rota.
- **O mapa fica no código de propósito** — não criar tela, rota ou coleção para editar permissão. Mudar quem pode o quê é mudança revisada, não configuração.
- `hasRole()` (em `lib/auth/roles.ts`) é só para perguntas sobre a role em si, como "o alvo é super admin?".
- No JWT vai a lista (`roles`). `getSession()` exige que o conjunto do token seja **igual** ao do banco: ganhou ou perdeu uma role, o token antigo deixa de valer e a pessoa entra de novo.
- Roles do banco → nomes/rótulos: `userRoleNames()`, `roleLabels()` em `lib/auth/user-roles.ts`.
- A tela e a API de usuários só mexem em `ASSIGNABLE_ROLES` (`admin`, `zelador`, `porteiro`, `sindico`). `superadmin` e `administradora` nunca entram nem saem por ali. As demais (`UNASSIGNABLE_ROLES`) não entram nem saem por ali — ao editar, são preservadas como estão no banco.
- Não há compatibilidade com o formato antigo de role única: usuário sem `role_ids` não entra.

## Super admin (plataforma)

- `superadmin` é a role de quem opera a plataforma. **Pode tudo** (`can()` devolve `true` para qualquer permissão): cria os condomínios e, quando preciso, age dentro de qualquer um.
- **Só o super admin cria administradora e condomínio autogerido** — em `/admin/condos` (`POST /api/admin/organizations` e `POST /api/admin/condos`, lógica em `lib/condos/create.ts`), sempre já com o admin. **Não existe cadastro público**: nada de `/register` nem rota aberta que crie condomínio ou usuário. Dali em diante o admin do condomínio cuida da própria equipe.
- **Para agir dentro de um condomínio o super admin "entra" nele**: `POST /api/condos/{id}/enter` reassina o JWT com o `condo_id` de lá. As telas e rotas seguem filtrando por `session.condoId` como sempre — não há "modo super admin" nas queries. `getSession()` aceita `condo_id` diferente do do usuário **só** para super admin (qualquer condomínio que exista) e para admin de administradora (só condomínio dela). O que ele faz fica no audit log daquele condomínio, no nome dele. Para voltar, entra no próprio condomínio pela mesma tela (ou faz login de novo).
- **Só se atribui alterando o banco à mão.** Não existe tela, rota nem script para isso, de propósito. No mongosh:
  ```js
  const role = db.roles.findOne({ name: 'superadmin' })
  db.users.updateOne({ email: 'voce@exemplo.com' }, { $addToSet: { role_ids: role._id } })   // conceder
  db.users.updateOne({ email: 'voce@exemplo.com' }, { $pull: { role_ids: role._id } })       // retirar
  ```
  Depois, sair e entrar de novo no app. O documento da role é criado sozinho na subida do app (`lib/db/indexes.ts`); criar o documento não dá acesso a ninguém.
- **Ninguém mexe em quem está acima** — `canManageUserWith()` em `lib/auth/roles.ts`, usada no PUT/DELETE/erase de usuários e na tela de edição: super admin só por outro super admin; admin de administradora só por outro admin dela ou super admin.
- Quem tem `superadmin` só é editado, desativado ou removido por outro super admin (403 para os demais) — senão bastaria trocar a senha dele para assumir a plataforma.
- Telas em `app/(dashboard)/admin/`: `/admin/condos` (criar condomínio, entrar em qualquer um), `/admin/errors` (erros do sistema), `/admin/ai` (uso de IA) e `/admin/permissions` (consulta do que cada role pode). Página e rota começam por `getSuperAdminSession()`; o proxy redireciona quem não é.
- **São a única exceção à regra de filtrar por `condo_id`**: mostram dados de todos os condomínios, de propósito. Não copiar esse padrão para tela de condomínio.
- `error_logs` e `ai_usage` têm prazo de vida no banco (90 e 400 dias, índice TTL). São dado técnico, não dado de morador — por isso não conflitam com a regra de retenção abaixo.
- Custo de IA é estimativa: preço vem de `AI_PRICE_INPUT_USD_PER_MTOK` / `AI_PRICE_OUTPUT_USD_PER_MTOK`. Não fixar preço no código.

## Administradora e condomínio autogerido

- **Condomínio é autogerido ou de uma administradora.** `condominiums.org_id` é opcional: sem ele o condomínio é autogerido (rótulo "Autogerido") e quem manda é o `admin` dele. **Nunca criar administradora de fachada** para um condomínio autogerido.
- **Administradora** = documento em `organizations`. O admin dela tem a role `administradora` **e** `users.org_id` — um sem o outro não vale nada (`getSession()` ignora `org_id` de quem não tem a role).
- O admin da administradora tem `condo_id` como qualquer usuário: é só o condomínio onde ele cai ao fazer login. Ele troca para outro condomínio dela em `/condos` ("Entrar"), pelo mesmo mecanismo do super admin. **As queries não mudam**: tudo segue filtrando por `session.condoId`; o que muda é em quais condomínios `getSession()` aceita que ele esteja.
- **A administradora nunca vem do corpo do request**: `POST /api/org/condos` cria o condomínio na administradora do condomínio em que a sessão está.
- Pode existir `admin` local num condomínio de administradora (delegação). Ele não alcança os outros condomínios nem mexe no admin da administradora.
- A role `administradora` só nasce junto com a administradora (`POST /api/admin/organizations`, super admin). Não há tela para adicionar outro admin a uma administradora existente — ver ROADMAP.
- Remoção definitiva de condomínio (`eraseCondo`): admin da administradora que "morava" ali vai para outro condomínio dela; se era o último, a administradora e os admins dela saem junto.

## Documentos legais e retenção

- `/termos` e `/privacidade` são públicas (`app/(legal)/`). Identificação de quem opera e canal de contato vêm de `LEGAL_COMPANY_NAME`, `LEGAL_COMPANY_DOC`, `LEGAL_CONTACT_EMAIL` — nada fixo no código.
- **Mudou o texto? Atualizar `TERMS_VERSION` em `lib/legal/terms.ts`** (é a data mostrada nos documentos). Não há aceite gravado: o cadastro público acabou e quem contrata é atendido pelo operador da plataforma.
- **Não existe exclusão automática por prazo.** Dado pessoal só sai a pedido do titular ou do condomínio, pelas rotas abaixo. A Política de Privacidade afirma isso — não criar job de limpeza sem mudar o texto.
- Mudou o que é coletado, com quem é compartilhado ou por quanto tempo fica? A Política de Privacidade tem que mudar junto.

## Remoção definitiva (LGPD)

Para atender pedido de exclusão do titular. **Só admin** (nem síndico) — ou o super admin, depois de entrar no condomínio —, **sem botão na interface** — é chamada pelo dev, com a sessão de um admin do condomínio. Diferente do soft-delete: apaga do banco e do S3 e não tem volta. Lógica em `lib/lgpd/erase.ts`.

| Rota | Corpo | O que apaga |
|---|---|---|
| `DELETE /api/residents/{id}/erase` | `{ "confirm": "APAGAR DEFINITIVAMENTE" }` | cadastro do morador; foto, QR code, observações, PIN e link público das encomendas dele; conteúdo dos audit logs. As encomendas ficam, anônimas. **Recusa (409) se houver encomenda aguardando retirada** |
| `DELETE /api/users/{id}/erase` | `{ "confirm": "APAGAR DEFINITIVAMENTE" }` | cadastro, avatar e links de senha do usuário; nos logs o nome vira "Usuário removido". Não remove a si mesmo |
| `DELETE /api/condo/erase` | `{ "confirm": "<nome exato do condomínio>", "password": "<senha do admin>" }` | o condomínio inteiro: pasta no S3, encomendas, moradores, usuários, audit logs |

Como chamar: logado como admin no navegador, no console — `await fetch('/api/residents/<id>/erase', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'APAGAR DEFINITIVAMENTE' }) }).then(r => r.json())`.

## Como o request flui (auth)

1. `proxy.ts` (o antigo `middleware.ts`; no Next 16 roda em Node, sem banco) é só a primeira barreira: valida o cookie `encoraj_token` (JWT, `jose`), aplica a permissão de cada **página** (`PAGE_PERMISSIONS`), devolve 401 JSON para `/api/*` sem token e redirect para `/login?next=` nas páginas. **Não injeta identidade em header** — e apaga qualquer `x-user-*`/`x-condo-*` que o cliente mande.
2. A identidade vem sempre do cookie, verificado em `lib/auth/session.ts`:
   - `getSession()` — verifica o JWT **e** confere no MongoDB se o usuário está ativo, se já trocou a senha recebida de outra pessoa, no mesmo condomínio, com exatamente as mesmas roles, e se o token é posterior a `password_changed_at`. É o que torna a sessão revogável. Usado por toda rota de API e pelo layout do dashboard (que manda para `/api/auth/logout` quando falha).
   - `readSession()` — só verifica o JWT, sem banco. Para Server Components de página, que rodam sob o layout já validado.
3. Nada depende do proxy para segurança: se ele for contornado (o Next já teve CVE disso), rota e página continuam exigindo cookie válido.
4. O proxy só protege páginas; **cada rota de API checa a permissão por conta própria**.
5. Roles se somam (ver "Permissões"). Multi-tenancy é por filtro: não existe isolamento no banco. Email é único entre usuários **ativos de todos os condomínios** — a pessoa só entra em outro condomínio depois de desativada no anterior; condomínio novo só nasce em `/admin/condos`.
6. Páginas do dashboard leem o MongoDB direto (Server Components). As únicas rotas `GET /api/*` são `/api/condo` (tela de configurações), os exports CSV e o logout.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19
- **Database**: MongoDB Atlas (`mongodb` driver 7)
- **Runtime**: Node 22 (`engines` + `.nvmrc`)
- **Auth**: JWT (`jose`) + password hashing (`bcryptjs`)
- **Validation**: Zod v4
- **Styling**: Panda CSS 1.x — **não subir para a 2 sem ler a Etapa 5 da Fase 11** (quebra em silêncio)
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
- Imagens do S3 usam `<Image unoptimized>`: o link assinado muda a cada render e não deve passar pelo otimizador do Next
- Acesso: toda rota e página protegida checa com `can(session, 'permissão')` — página de condomínio: `readSession()` e logo depois `if (!can(session, '...')) notFound()`. Exceções (qualquer logado): `/`, `/profile`, `users/me/*`, `GET /api/condo`, `POST /api/client-errors`
- Soft-delete pattern: `status_id = deleted` + `deleted_at` + `deleted_by`; listagens filtram `{ status_id: (await getStatus('active'))._id }`
- Audit log: toda escrita (create/update/delete) gera documento em `audit_logs` via `lib/audit/log.ts`
- Unidade do morador sempre por `formatUnit()` ("Bloco A · Apto 101") e opção de seleção por `residentLabel()`; moradores de uma lista de encomendas por `getResidentMap()` — tudo em `lib/residents/lookup.ts`
- Troca de sessão (login, primeiro acesso, entrar em outro condomínio): `window.location.href` (não `router.push`) — força o layout a renderizar de novo com o cookie novo. Com destino fixo o lint avisa: desligar a regra só nessa linha, com o motivo
- Redirects pós-ação dentro do app (salvar form, confirmar entrega): usar `router.push(...)` — permite toast aparecer antes da navegação client-side
- API auth pattern: `getSession()` de `lib/auth/session.ts` (ver "Regras de segurança")
- **Sem hardcode de labels ou opções de negócio**: nenhum mapa de tradução nem array de opções fixo no código — a fonte da verdade é o banco:
  - Labels de status/role: `getStatus(name)`, `getStatusById(id)`, `getRole(name)`, `getRoleById(id)` de `lib/db/status-map.ts` — retornam `{ _id, name, label }`; use o que precisar de cada chamada
  - Opções de `<select>` (roles, status, etc.): Server Component pai busca do banco e passa como prop `options: { value, label }[]` para o Client Component filho — o Client Component nunca conhece as opções, só as renderiza
  - Regra geral: se o dado vive no banco, ele vem do banco; se muda no banco, muda em toda a plataforma automaticamente

## Roles

- `superadmin` — operador da plataforma: pode tudo, em qualquer condomínio; cria administradoras e condomínios autogeridos (ver "Super admin")
- `administradora` — admin de uma administradora: tudo que o `admin` pode, em todos os condomínios dela; cria condomínios nela (ver "Administradora")
- `admin` — admin de **um** condomínio: residents, users, packages, reports, settings
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
          layout.tsx        ← moldura (cartão centralizado) das telas sem login
          _components/AuthHeader.tsx ← título + texto de apoio do cartão
          login/page.tsx
          forgot-password/page.tsx, reset-password/page.tsx ← recuperação de senha (link do login segue comentado)
          change-password/page.tsx ← primeiro acesso: troca obrigatória da senha recebida de outra pessoa
        (legal)/
          termos/page.tsx, privacidade/page.tsx ← públicas
        _components/ServiceWorker.tsx ← Client; registra public/sw.js em produção
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
            DeletedToggle.tsx   ← ativos/excluídos (`?deleted=1`) em moradores e usuários
            SearchInput.tsx     ← busca com debounce na URL (`?q=`): encomendas, relatórios, moradores
          _lib/
            styles.ts           ← cardCss, h1Css, mutedCss, labelCss, thCss… repetidos entre páginas
            compress-image.ts, use-photo-upload.ts, use-local-storage.ts
          packages/
            page.tsx
            new/page.tsx        ← câmera/upload → form → S3 + QR code
            new/_components/NewPackageForm.tsx
            [id]/page.tsx       ← exibe foto + QR code
          residents/
            page.tsx
            new/page.tsx
            [id]/edit/page.tsx
            _components/        ← DeleteButton, RestoreButton, WhatsAppField, ResidentForm
          users/
            page.tsx
            new/page.tsx
            [id]/edit/page.tsx
            _components/        ← UserForm, DeleteUserButton, UserItems (linha e cartão da lista)
          settings/page.tsx     ← Client; edita nome do condo
          reports/page.tsx      ← indicadores, filtros, timeline, export CSV
          reports/management/page.tsx ← relatório gerencial (período, picos, unidades, equipe, paradas)
          admin/condos/page.tsx ← super admin: lista todos os condomínios, cria administradora ou condomínio autogerido, entra em qualquer um
          condos/page.tsx       ← administradora: condomínios dela, cria condomínio, entra em qualquer um deles
          admin/errors/page.tsx ← super admin: erros do sistema, de todos os condomínios
          admin/ai/page.tsx     ← super admin: uso de IA (chamadas, tokens, custo estimado)
          admin/permissions/page.tsx ← super admin: matriz roles × permissões (só consulta)
        api/
          auth/route.ts         ← POST login, DELETE logout
          auth/logout/route.ts  ← GET limpa cookie + redirect /login (sessão revogada)
          auth/forgot/route.ts  ← POST envia email de reset
          auth/reset/route.ts   ← POST valida token + redefine senha
          condo/route.ts        ← GET/PUT condo info
          residents/route.ts    ← POST
          residents/[id]/route.ts ← PUT, DELETE (soft), PATCH (restore)
          users/route.ts        ← POST
          users/[id]/route.ts   ← PUT, DELETE (soft)
          users/me/password/route.ts ← PUT altera senha do usuário logado
          packages/route.ts     ← POST registra chegada (foto + QR code + PIN + link público)
          packages/[id]/deliver/route.ts ← POST confirmar entrega
          packages/[id]/notify/route.ts  ← POST marca notified_at + status notified
          upload/route.ts       ← POST recebe imagem → S3 → URL
          ocr/route.ts          ← POST imagem → Gemini → morador sugerido
          condo/photo/route.ts  ← POST/DELETE foto do condo → S3 + DB
          reports/export/route.ts ← GET CSV das encomendas (mesmos filtros de /reports)
          client-errors/route.ts ← POST erro que estourou na tela (logado, com limite por usuário)
          admin/errors/[id]/route.ts ← PATCH resolver/reabrir erro (só super admin)
          admin/condos/route.ts ← POST cria condomínio autogerido + admin dele (só super admin)
          admin/organizations/route.ts ← POST cria administradora + primeiro condomínio + admin dela (só super admin)
          org/condos/route.ts   ← POST cria condomínio na administradora do condomínio da sessão
          condos/[id]/enter/route.ts ← POST troca o condomínio da sessão (super admin: qualquer um; administradora: os dela)
          reports/management/export/route.ts ← GET CSV de uma seção do gerencial (?section=daily|units|staff|stalled)
          residents/[id]/erase, users/[id]/erase, condo/erase ← DELETE remoção definitiva (LGPD), só admin
          users/me/photo/route.ts ← POST/DELETE foto de perfil → S3 + DB
      lib/
        db/         ← client.ts, collections.ts, status-map.ts, indexes.ts, escape-regex.ts
        auth/       ← jwt.ts, cookies.ts, session.ts (getSession/readSession), permissions.ts (can), roles.ts, user-roles.ts, super-admin.ts, rateLimit.ts, email.ts, password.ts (passwordSchema/hashPassword), password-rules.ts (PASSWORD_MIN, sem dependência de servidor), current-password.ts (verifyCurrentPassword), safe-next.ts
        api/        ← http.ts → respostas padrão das rotas + parseBody()
        text/       ← slug.ts, csv.ts
        upload/     ← image.ts → readImageUpload()
        audit/      ← log.ts → logAction()
        email/      ← mailer.ts (Nodemailer SMTP), templates.ts (HTML emails)
        s3/         ← client.ts, upload.ts (uploadToS3 → URL canônica), sign.ts (signS3Url), delete.ts
        lgpd/       ← erase.ts → eraseResident / eraseUser / eraseCondo
        condos/     ← create.ts → createCondoWithAdmin() / createOrganizationWithAdmin() / createCondoInOrganization()
        packages/   ← filter.ts → buildPackageFilter() / packageStatusOptions(); stats.ts → getPackageStats()
        residents/  ← lookup.ts → getResidentMap() / formatUnit() / residentLabel()
        reports/    ← management.ts → resolvePeriod() / getManagementReport()
        observability/ ← report.ts → reportError()
        ai/         ← usage.ts → recordAiUsage() / getAiUsageReport()
        qrcode/     ← generate.ts (gera PNG + sobe para S3 → URL)
        gemini/     ← ocr.ts → analyzePackageLabel()
      instrumentation.ts ← onRequestError: erros de renderização/proxy → reportError()
      scripts/
        seed.ts     ← cria condo demo + admin inicial
        preflight.ts ← conferência do banco (somente leitura)
      styled-system/  ← gerado por panda codegen (gitignored)
  packages/
    ui/             ← @encoraj/ui (Button, Input, Text, Badge, Spinner, FormField, PasswordField, Card, Alert, Toast, ConfirmDialog)
    panda-config/   ← @encoraj/panda-config (tokens + recipes)
    tsconfig/       ← @encoraj/tsconfig
```

## Data Models (MongoDB)

```ts
// statuses
{ _id, name: 'active'|'inactive'|'deleted'|'arrived'|'notified'|'delivered', label, created_at }

// roles
{ _id, name: 'superadmin'|'administradora'|'admin'|'zelador'|'porteiro'|'sindico'|'morador', label, status_id, created_at }

// organizations (administradoras)
{ _id, name, status_id, created_at }

// condominiums — sem org_id = autogerido
{ _id, org_id?, name, slug, photo_url?, status_id, created_at }

// users — org_id só no admin de administradora (role `administradora`)
{ _id, condo_id, org_id?, name, email, password_hash, password_changed_at?, must_change_password?, role_ids: ObjectId[], status_id, photo_url?, created_at,
  deleted_at?, deleted_by? }

// residents
{ _id, condo_id, name, apartment, bloco?, whatsapp, status_id, created_at, created_by,
  deleted_at?, deleted_by? }   // sem updated_at: histórico vive no audit_log

// packages
{ _id, condo_id, resident_id, code, delivery_pin?, public_token?, qrcode_url, photo_url, status_id,
  arrived_at, arrived_by, notified_at?, delivered_at?, delivered_by?, notes?, created_at }
// code = 'PKG-' + 6 últimos hex do _id; delivery_pin = 6 dígitos exigidos em /deliver
// delivery_pin e public_token só ficam ausentes depois da remoção definitiva do morador (LGPD), que exige
// tudo já retirado — então encomenda em aberto SEMPRE tem PIN, e /deliver exige o código sem exceção
// QR code aponta para APP_URL/packages/{id} (porteiro); morador recebe o link público /p/{public_token}

// rate_limits
{ _id, key, attempts, reset_at }   // TTL em reset_at; ver lib/auth/rateLimit.ts

// audit_logs
{ _id, condo_id, entity: 'residents'|'users'|'packages'|'condominiums', entity_id, action: 'created'|'updated'|'deleted',
  actor_id, actor_name, before?, after?, timestamp }

// error_logs (plataforma, sem condo_id; TTL 90 dias)
{ _id, fingerprint, label, name, message, stack?, extra?, env, count, first_at, last_at, resolved_at?, resolved_by? }

// ai_usage (TTL 400 dias)
{ _id, condo_id, user_id, feature: 'ocr', model, outcome: 'matched'|'no_match'|'invalid_response'|'error'|'disabled',
  confidence?, prompt_tokens, output_tokens, total_tokens, latency_ms, image_bytes, created_at }

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
  roles: string[]      // slugs — as permissões se somam: 'superadmin' | 'administradora' | 'admin' | 'zelador' | 'porteiro' | 'sindico'
  condo_id: string
  condo_name: string
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
#               condos/{condo_id}/users/{user_id}/avatar.{ext}
#               condos/{condo_id}/logo.{ext}

# Google Gemini
GEMINI_API_KEY=
GEMINI_MODEL=        # opcional; padrão gemini-2.0-flash

# Custo estimado de IA: USD por 1 milhão de tokens
AI_PRICE_INPUT_USD_PER_MTOK=
AI_PRICE_OUTPUT_USD_PER_MTOK=


# Documentos legais (/termos, /privacidade)
LEGAL_COMPANY_NAME=
LEGAL_COMPANY_DOC=
LEGAL_CONTACT_EMAIL=

```

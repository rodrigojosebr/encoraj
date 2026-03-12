# Encoraj — Gestão de Encomendas para Condomínios

## O Problema

Condomínios residenciais enfrentam um caos silencioso na portaria: encomendas chegam em volume crescente, porteiros anotam destinatários em papéis ou planilhas improvisadas, moradores não são notificados a tempo, pacotes ficam acumulados por dias, e quando alguém vai buscar, ninguém sabe ao certo onde está ou se já foi retirado.

Os problemas mais comuns:
- Porteiros que escrevem o nome errado do destinatário (etiquetas difíceis de ler)
- Moradores que não sabem que têm encomenda esperando
- Sem registro formal de quem retirou e quando
- Síndico sem visibilidade do volume e status das entregas
- Pacotes perdidos ou entregues à pessoa errada

## A Solução

**Encoraj** é um sistema web para gestão de encomendas em condomínios. Substitui papel e improviso por um fluxo digital completo: o porteiro fotografa a etiqueta, a IA lê os dados automaticamente, o morador recebe notificação via WhatsApp, e a retirada é confirmada com QR Code ou código único.

Tudo rastreado. Tudo auditável.

## Personas

### Porteiro
Usa o sistema no dia a dia. Precisa de uma interface rápida e simples — registrar chegada e confirmar retirada em poucos toques, mesmo com as mãos ocupadas. Não é usuário técnico.

### Síndico
Quer visibilidade sem precisar perguntar ao porteiro. Acessa relatórios para ver volume de entregas, encomendas em aberto, histórico de retiradas.

### Zelador
Responsável pelo cadastro de moradores — cria, edita e desativa registros. Não acessa encomendas nem relatórios.

### Admin
Gerencia o condomínio no sistema: cadastra moradores, cria usuários (porteiros, zeladores e síndicos), configura nome e foto do condomínio.

### Morador
Não usa o sistema diretamente. Recebe notificação no WhatsApp com foto da encomenda, código de retirada e QR Code.

## Fluxos Principais

### Chegada da Encomenda
```
Porteiro abre o app
  → Toca "Registrar Encomenda"
  → Tira foto da etiqueta
  → Gemini Flash extrai nome e apartamento da etiqueta  ← Fase 3c (pendente)
  → Porteiro confirma ou ajusta o destinatário
  → Sistema gera código único + QR Code (salvo no S3)
  → Foto da etiqueta salva no S3, registro criado no MongoDB
  → Z-API envia WhatsApp ao morador:  ← Fase 4b (pendente)
       "Chegou uma encomenda para você!
        Código: [XXXX] | Apto [NNN]
        [Foto] | [QR Code]"
  → Fase 4a (atual): porteiro clica "Notificar via WhatsApp"
       → abre wa.me com mensagem pronta + link público /p/{id}
```

### Retirada da Encomenda
```
Morador chega à portaria com código ou QR Code
  → Porteiro escaneia QR Code → vai direto para /packages/{id}
    (QR contém APP_URL/packages/{id}; se não estiver logado → login → ?next= → retorna à encomenda)
  → Sistema exibe dados: destinatário, foto, data de chegada
  → Porteiro confirma a entrega via ConfirmDialog
  → Registro atualizado: delivered_at, delivered_by, status → delivered
```

### Administração
```
Admin acessa painel
  → CRUD de moradores (nome, bloco, apto, WhatsApp)
  → Cria/edita usuários porteiros e síndicos
  → Configura nome e foto do condomínio em /settings
  → Gerencia próprio perfil em /profile (foto, senha)
```

### Relatórios
```
Admin ou Síndico acessa /reports
  → Filtra por status: chegou / notificado / retirado
  → Vê timeline: chegada → notificação → retirada
  → Identifica encomendas paradas há muitos dias
  → Exporta CSV compatível com Excel (BOM UTF-8)
```

## Modelos de Dados

> **Nota**: Todos os documentos usam `status_id: ObjectId` (ref: statuses) em vez de `active: boolean` ou campos de enum inline. Labels são resolvidos em runtime via `getStatus()`/`getRole()` de `lib/db/status-map.ts`.

> **Convenção timestamps**: `created_at` e `deleted_at`/`deleted_by` ficam nos documentos. Não há `updated_at`/`updated_by` — o `audit_log` é a fonte da verdade para histórico de alterações. `deleted_at`/`deleted_by` são removidos quando o documento é restaurado (`$unset`).

### `statuses`
```ts
{
  _id: ObjectId
  name: 'active' | 'inactive' | 'deleted' | 'arrived' | 'notified' | 'delivered'
  label: string   // "Ativo", "Retirado", etc. — fonte da verdade para exibição
  created_at: Date
}
// Índice: { name: 1 } unique
```

### `roles`
```ts
{
  _id: ObjectId
  name: 'admin' | 'zelador' | 'porteiro' | 'sindico' | 'morador'
  label: string   // "Administrador", "Porteiro", etc.
  status_id: ObjectId   // ref: statuses
  created_at: Date
}
// Índice: { name: 1 } unique
```

### `condominiums`
```ts
{
  _id: ObjectId
  name: string          // "Residencial Bela Vista"
  slug: string          // "residencial-bela-vista" — único
  photo_url?: string    // URL S3 da logo do condomínio
  status_id: ObjectId   // ref: statuses
  created_at: Date
}
// Índice: { slug: 1 } unique
```

### `users`
```ts
{
  _id: ObjectId
  condo_id: ObjectId    // ref: condominiums
  name: string
  email: string         // único globalmente entre usuários ativos (app-level, não DB unique)
  password_hash: string
  role_id: ObjectId     // ref: roles
  status_id: ObjectId   // ref: statuses
  photo_url?: string    // URL S3 da foto de perfil
  created_at: Date
  deleted_at?: Date     // soft delete — removido ao restaurar
  deleted_by?: ObjectId // ref: users — removido ao restaurar
}
// Índice: { email: 1 } (não unique — soft-delete libera o slot; unicidade enforçada em app)
// Índice: { condo_id: 1 }
```

### `residents`
```ts
{
  _id: ObjectId
  condo_id: ObjectId    // ref: condominiums
  name: string
  apartment: string     // ex: "101", "5B"
  bloco?: string        // ex: "A", "Torre 1" (opcional)
  whatsapp: string      // formato internacional: +5511999999999
  status_id: ObjectId   // ref: statuses
  created_at: Date
  created_by: ObjectId  // ref: users
  deleted_at?: Date     // soft delete — removido ao restaurar
  deleted_by?: ObjectId // ref: users — removido ao restaurar
}
// Sem updated_at / updated_by — histórico de edições está no audit_log
```

### `packages`
```ts
{
  _id: ObjectId
  condo_id: ObjectId    // ref: condominiums
  resident_id: ObjectId // ref: residents
  code: string          // código único de 6 chars (ex: "A3K7X2")
  qrcode_url: string    // URL S3 do QR Code PNG
  photo_url: string     // URL S3 da foto da etiqueta
  status_id: ObjectId   // ref: statuses (arrived | notified | delivered)
  arrived_at: Date
  arrived_by: ObjectId  // ref: users (porteiro)
  notified_at?: Date
  delivered_at?: Date
  delivered_by?: ObjectId
  notes?: string
  created_at: Date
}
```

### `audit_logs`
```ts
{
  _id: ObjectId
  condo_id: ObjectId
  entity: 'residents' | 'users' | 'packages'
  entity_id: ObjectId
  action: 'created' | 'updated' | 'deleted'
  actor_id: ObjectId
  actor_name: string    // snapshot do nome no momento da ação
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  timestamp: Date
}
```

### `password_reset_tokens`
```ts
{
  _id: ObjectId
  user_id: ObjectId     // ref: users
  token_hash: string    // SHA-256 do token enviado por email
  expires_at: Date      // TTL index — auto-deletado pelo MongoDB após 1h
  used_at?: Date        // preenchido quando token é consumido
}
// Índice TTL: { expires_at: 1 }
```

### `rate_limits`
```ts
{
  _id: ObjectId
  key: string           // ex: "login:1.2.3.4", "forgot:email@x.com"
  attempts: number
  reset_at: Date        // TTL index — auto-deletado pelo MongoDB
}
// Índice: { key: 1 } unique
// Índice TTL: { reset_at: 1 }
```

## JWT Payload
```ts
{
  sub: string           // user _id
  name: string
  role: string          // slug: 'admin' | 'zelador' | 'porteiro' | 'sindico'
  condo_id: string
  condo_name: string
  photo_url?: string        // URL S3 da foto de perfil do usuário
  condo_photo_url?: string  // URL S3 da logo do condomínio
}
```

## Integrações

| Serviço | Uso | Status |
|---|---|---|
| **MongoDB Atlas** | Banco de dados principal | ✅ |
| **Nodemailer SMTP** | Email de recuperação de senha | ✅ implementado / pendente config SMTP |
| **AWS S3** | Fotos de etiquetas, QR Codes, fotos de perfil e condo | ✅ |
| **Google Gemini Flash** | OCR da etiqueta | 🔜 Fase 3c |
| **Z-API** | Envio automático de mensagens WhatsApp | 🔜 Fase 4b |

## Arquitetura de Segurança

- Autenticação via JWT (access token no cookie HttpOnly)
- Senhas com bcryptjs (hash + salt)
- Role-based access: cada rota valida o role do usuário
- Rate limiting via MongoDB (funciona em Vercel serverless)
- Tokens de reset: `randomBytes(32)` → SHA-256 hash no banco; nunca o token bruto
- Email único globalmente entre usuários ativos (soft-delete libera o slot)
- Secrets exclusivamente via variáveis de ambiente
- Upload de imagens validado no servidor antes de enviar ao S3
- Rota pública `/p/[id]` usa ObjectId como token implícito (96 bits, impossível de adivinhar)

## Estrutura de Pastas (estado atual)

```
apps/encoraj/
  app/
    p/
      [id]/page.tsx              ← pública (sem login): foto, código, QR; entregue → banner verde
    (auth)/
      login/page.tsx             ← LoginForm em Suspense (useSearchParams); redireciona para ?next=
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx    ← ?token= na URL
    (dashboard)/
      layout.tsx                 ← Server Component; NAV_ITEMS por role; decodeURIComponent nos headers
      page.tsx                   ← dashboard home com stats + encomendas recentes (cards mobile / tabela desktop)
      error.tsx
      loading.tsx
      _components/
        DashboardShell.tsx
        SidebarShell.tsx         ← collapsed + mobile overlay; ouve 'user-photo-updated' e 'condo-photo-updated'
        MobileTopBar.tsx         ← ouve 'condo-photo-updated'
        Avatar.tsx               ← iniciais + cor por hash; suporte a photoUrl
        ThemeToggle.tsx
        LogoutButton.tsx
        InstallButton.tsx        ← PWA install (Android nativo + iOS instrução)
        PageSkeleton.tsx         ← SkeletonHeader, SkeletonTable, SkeletonCards, etc.
      packages/
        page.tsx                 ← busca por nome/código + filtro status (cards mobile / tabela desktop)
        loading.tsx
        new/page.tsx             ← câmera/upload → form manual → registra
        new/_components/NewPackageForm.tsx
        [id]/
          page.tsx               ← foto + QR code + NotifyButton + DeliverButton; banner verde se entregue
          loading.tsx
          _components/
            DeliverButton.tsx    ← ConfirmDialog (variant="warning")
            NotifyButton.tsx     ← wa.me + POST /notify; mostra data se já notificado
      residents/
        page.tsx
        loading.tsx
        new/page.tsx
        [id]/edit/
          page.tsx
          loading.tsx
        _components/
          DeleteButton.tsx       ← Trash2 icon + ConfirmDialog (variant="danger")
          RestoreButton.tsx      ← RotateCcw icon + ConfirmDialog (variant="warning")
          DeletedToggle.tsx
          WhatsAppField.tsx
      users/
        page.tsx
        loading.tsx
        new/page.tsx
        [id]/edit/
          page.tsx
          loading.tsx
        _components/
          UserForm.tsx
          DeleteUserButton.tsx   ← Trash2 icon + ConfirmDialog (variant="danger")
      profile/
        page.tsx                 ← Server Component; todos os roles
        loading.tsx
        _components/ProfileClient.tsx  ← foto de perfil clicável; remove foto; alterar senha
      reports/
        page.tsx
        loading.tsx
        _components/ExportCSV.tsx
      settings/
        page.tsx                 ← foto do condo clicável; remove foto; edita nome
        loading.tsx
    api/
      auth/
        route.ts                 ← POST login (rate-limited), DELETE logout
        forgot/route.ts          ← POST forgot-password (rate-limited, silencioso)
        reset/route.ts           ← POST reset-password
      register/route.ts
      condo/
        route.ts                 ← GET/PUT nome do condo
        photo/route.ts           ← POST upload foto → S3 + re-sign JWT; DELETE remove foto
      residents/
        route.ts
        [id]/route.ts            ← PUT editar; DELETE soft-delete; PATCH restaurar
      users/
        route.ts
        [id]/route.ts            ← PUT editar; DELETE soft-delete
        me/password/route.ts     ← PUT alterar senha logado
        me/photo/route.ts        ← POST upload foto → S3 + re-sign JWT; DELETE remove foto
      packages/
        route.ts
        [id]/route.ts
        [id]/deliver/route.ts    ← POST confirmar retirada
        [id]/notify/route.ts     ← POST marca notified_at + status notified
      upload/route.ts            ← POST imagem → S3 → URL
      ocr/route.ts               ← pendente Gemini (Fase 3c)
      whatsapp/route.ts          ← pendente Z-API (Fase 4b)
    manifest.ts                  ← Web App Manifest (PWA)
    icon.tsx                     ← 32×32 dynamic icon
    apple-icon.tsx               ← 180×180 apple icon
    layout.tsx
    globals.css
    not-found.tsx
    Providers.tsx
  lib/
    db/
      client.ts
      collections.ts             ← todos os tipos + helpers de collection
      status-map.ts              ← getStatus/getStatusById/getRole/getRoleById (cached)
    auth/
      jwt.ts
      cookies.ts
      rateLimit.ts               ← checkRateLimit(key, max, windowMs)
    audit/log.ts
    email/
      mailer.ts                  ← Nodemailer SMTP
      templates.ts               ← resetPasswordEmail()
    s3/
      client.ts                  ← S3Client com env vars
      upload.ts                  ← uploadToS3(buffer, key, contentType) → URL pública
    qrcode/
      generate.ts                ← gera PNG + sobe para S3 → URL
    gemini/                      ← pendente (Fase 3c)
    zapi/                        ← pendente (Fase 4b)
  scripts/
    seed.ts
    gen-icons.mjs                ← gera ícones PWA estáticos via canvas
  public/
    icon-192.png
    icon-512.png
    maskable-192.png
    maskable-512.png
packages/
  ui/    ← @encoraj/ui
         Button, Input, Text, Badge, Spinner, FormField, Card, Alert, Toast, ConfirmDialog
  panda-config/   ← @encoraj/panda-config (tokens + recipes; staticCss para badge variants)
  tsconfig/       ← @encoraj/tsconfig
```

## S3 — Estrutura de Chaves

```
condos/{condo_id}/packages/photos/{uuid}.jpg     ← foto da etiqueta
condos/{condo_id}/packages/qrcodes/{package_id}.png  ← QR Code
condos/{condo_id}/users/{user_id}/avatar.{ext}   ← foto de perfil
condos/{condo_id}/logo.{ext}                     ← logo do condomínio
```

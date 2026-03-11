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
Gerencia o condomínio no sistema: cadastra moradores, cria usuários (porteiros, zeladores e síndicos), configura o template da mensagem WhatsApp.

### Morador
Não usa o sistema diretamente. Recebe notificação no WhatsApp com foto da encomenda, código de retirada e QR Code.

## Fluxos Principais

### Chegada da Encomenda
```
Porteiro abre o app
  → Toca "Registrar Encomenda"
  → Tira foto da etiqueta
  → Gemini Flash extrai nome e apartamento da etiqueta
  → Porteiro confirma ou ajusta o destinatário
  → Sistema gera código único + QR Code
  → Foto salva no S3, registro criado no MongoDB
  → Z-API envia WhatsApp ao morador:
       "Chegou uma encomenda para você!
        Código: [XXXX] | Apto [NNN]
        [Foto] | [QR Code]"
```

### Retirada da Encomenda
```
Morador chega à portaria com código ou QR Code
  → Porteiro escaneia QR Code ou digita código no app
  → Sistema exibe dados: destinatário, foto, data de chegada
  → Porteiro confirma a entrega
  → Registro atualizado: delivered_at, delivered_by
```

### Administração
```
Admin acessa painel
  → CRUD de moradores (nome, bloco, apto, WhatsApp)
  → Cria/edita usuários porteiros e síndicos
  → Configura nome do condomínio em /settings
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
  photo_url?: string    // pendente S3
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
  photo_url?: string    // pendente S3
  created_at: Date
  deleted_at?: Date     // soft delete
  deleted_by?: ObjectId // ref: users
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
  updated_at?: Date
  updated_by?: ObjectId
  deleted_at?: Date     // soft delete
  deleted_by?: ObjectId
}
```

### `packages`
```ts
{
  _id: ObjectId
  condo_id: ObjectId    // ref: condominiums
  resident_id: ObjectId // ref: residents
  code: string          // código único de 6 chars (ex: "A3K7X2")
  qrcode_url: string    // URL do QR Code (S3) — pendente
  photo_url: string     // URL da foto da etiqueta (S3) — pendente
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
  photo_url?: string        // user photo (S3, pendente)
  condo_photo_url?: string  // condo photo (S3, pendente)
}
```

## Integrações

| Serviço | Uso | Status |
|---|---|---|
| **MongoDB Atlas** | Banco de dados principal | ✅ |
| **Nodemailer SMTP** | Email de recuperação de senha | ✅ implementado / pendente config |
| **AWS S3** | Fotos de etiquetas, QR Codes, fotos de perfil | 🔜 Fase 3b |
| **Google Gemini Flash** | OCR da etiqueta | 🔜 Fase 3b |
| **Z-API** | Envio de mensagens WhatsApp | 🔜 Fase 4 |

## Arquitetura de Segurança

- Autenticação via JWT (access token no cookie HttpOnly)
- Senhas com bcryptjs (hash + salt)
- Role-based access: cada rota valida o role do usuário
- Rate limiting via MongoDB (funciona em Vercel serverless)
- Tokens de reset: `randomBytes(32)` → SHA-256 hash no banco; nunca o token bruto
- Email único globalmente entre usuários ativos (soft-delete libera o slot)
- Secrets exclusivamente via variáveis de ambiente
- Upload de imagens validado no servidor antes de enviar ao S3

## Estrutura de Pastas (estado atual)

```
apps/encoraj/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx        ← ?token= na URL
    (dashboard)/
      layout.tsx                     ← Server Component; NAV_ITEMS por role
      page.tsx                       ← dashboard home com stats + encomendas recentes
      error.tsx                      ← Error boundary
      loading.tsx                    ← Skeleton global do dashboard
      _components/
        DashboardShell.tsx
        SidebarShell.tsx             ← InstallButton no footer
        MobileTopBar.tsx
        Avatar.tsx
        ThemeToggle.tsx
        LogoutButton.tsx
        InstallButton.tsx            ← PWA install (Android nativo + iOS instrução)
        PageSkeleton.tsx             ← SkeletonHeader, SkeletonTable, etc.
      packages/
        page.tsx                     ← busca por nome/código + filtro status
        loading.tsx
        new/page.tsx                 ← pendente S3
        [id]/
          page.tsx
          loading.tsx
          _components/DeliverButton.tsx
      residents/
        page.tsx
        loading.tsx
        new/page.tsx
        [id]/edit/
          page.tsx
          loading.tsx
        _components/
      users/
        page.tsx
        loading.tsx
        new/page.tsx
        [id]/edit/
          page.tsx
          loading.tsx
        _components/
      profile/
        page.tsx                     ← Server Component; todos os roles
        loading.tsx
        _components/ProfileClient.tsx ← alterar senha; não-admin recebe toast
      reports/
        page.tsx
        loading.tsx
        _components/ExportCSV.tsx
      settings/
        page.tsx
        loading.tsx
    api/
      auth/
        route.ts                     ← POST login (rate-limited), DELETE logout
        forgot/route.ts              ← POST forgot-password (rate-limited)
        reset/route.ts               ← POST reset-password
      register/route.ts
      condo/route.ts
      residents/
        route.ts
        [id]/route.ts
      users/
        route.ts
        [id]/route.ts
        me/password/route.ts         ← PUT alterar senha logado
      packages/
        route.ts
        [id]/route.ts
        [id]/deliver/route.ts
      upload/route.ts                ← pendente S3
      ocr/route.ts                   ← pendente Gemini
      whatsapp/route.ts              ← pendente Z-API
    manifest.ts                      ← Web App Manifest (PWA)
    icon.tsx                         ← 32×32 dynamic icon
    apple-icon.tsx                   ← 180×180 apple icon
    layout.tsx
    globals.css
    not-found.tsx
    Providers.tsx
  lib/
    db/
      client.ts
      collections.ts                 ← todos os tipos + helpers de collection
      status-map.ts                  ← getStatus/getStatusById/getRole/getRoleById (cached)
    auth/
      jwt.ts
      cookies.ts
      rateLimit.ts                   ← checkRateLimit(key, max, windowMs)
    audit/log.ts
    email/
      mailer.ts                      ← Nodemailer SMTP
      templates.ts                   ← resetPasswordEmail()
    s3/                              ← pendente
    gemini/                          ← pendente
    zapi/                            ← pendente
    qrcode/                          ← pendente
  scripts/
    seed.ts
    gen-icons.mjs                    ← gera ícones PWA estáticos via canvas
  public/
    icon-192.png
    icon-512.png
    maskable-192.png
    maskable-512.png
packages/
  ui/                ← @encoraj/ui (Button, Input, Text, Badge, Spinner, FormField, Card, Alert, Toast)
  panda-config/      ← @encoraj/panda-config
  tsconfig/          ← @encoraj/tsconfig
```

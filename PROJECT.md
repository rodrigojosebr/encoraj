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

### Admin
Gerencia o condomínio no sistema: cadastra moradores, cria usuários (porteiros e síndicos), configura o template da mensagem WhatsApp.

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
  → CRUD de moradores (nome, apto, WhatsApp)
  → Cria/edita usuários porteiros e síndicos
  → Configura template da mensagem WhatsApp
```

### Relatórios
```
Admin ou Síndico acessa /reports
  → Filtra por status: chegou / notificado / retirado
  → Vê timeline: chegada → notificação → retirada
  → Identifica encomendas paradas há muitos dias
```

## Modelos de Dados

### `users`
```ts
{
  _id: ObjectId
  name: string
  email: string
  password_hash: string
  role: 'admin' | 'porteiro' | 'sindico'
  active: boolean
  created_at: Date
}
```

### `residents`
```ts
{
  _id: ObjectId
  name: string
  apartment: string        // ex: "101", "5B"
  whatsapp: string         // formato internacional: +5511999999999
  active: boolean
  created_at: Date
}
```

### `packages`
```ts
{
  _id: ObjectId
  resident_id: ObjectId    // ref: residents
  code: string             // código único de 6 caracteres (ex: "A3K7X2")
  qrcode_url: string       // URL do QR Code gerado (S3)
  photo_url: string        // URL da foto da etiqueta (S3)
  status: 'arrived' | 'notified' | 'delivered'
  arrived_at: Date
  arrived_by: ObjectId     // ref: users (porteiro)
  notified_at?: Date
  delivered_at?: Date
  delivered_by?: ObjectId  // ref: users (porteiro)
  notes?: string
  created_at: Date
}
```

## Integrações

| Serviço | Uso |
|---|---|
| **MongoDB Atlas** | Banco de dados principal |
| **AWS S3** | Armazenamento de fotos de etiquetas e QR Codes |
| **Google Gemini Flash** | OCR da etiqueta — extrai nome e apartamento da foto |
| **Z-API** | Envio de mensagens WhatsApp |

## Arquitetura de Segurança

- Autenticação via JWT (access token no cookie HttpOnly)
- Senhas com bcryptjs (hash + salt)
- Role-based access: cada rota valida o role do usuário
- Secrets exclusivamente via variáveis de ambiente
- Upload de imagens validado no servidor antes de enviar ao S3

## Estrutura de Pastas

```
app/
  (auth)/login/
  (dashboard)/
    layout.tsx          ← sidebar + auth guard por role
    page.tsx            ← dashboard home
    packages/
      page.tsx          ← listagem de encomendas
      new/page.tsx      ← registrar chegada (foto + OCR)
      [id]/page.tsx     ← detalhe + ação de entrega
    residents/
      page.tsx
      new/page.tsx
      [id]/edit/page.tsx
    users/page.tsx      ← admin only
    reports/page.tsx    ← admin + síndico
  api/
    auth/route.ts
    packages/route.ts
    packages/[id]/route.ts
    packages/[id]/deliver/route.ts
    residents/route.ts
    users/route.ts
    ocr/route.ts        ← Gemini Flash
    upload/route.ts     ← S3
    whatsapp/route.ts   ← Z-API
lib/
  db/       ← MongoDB client + helpers
  s3/       ← AWS S3 client
  gemini/   ← Gemini Flash client
  zapi/     ← Z-API client
  auth/     ← JWT helpers + middleware
  qrcode/   ← geração de QR Code
```

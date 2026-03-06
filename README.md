# Encoraj

Sistema web de gestão de encomendas para condomínios. Porteiro fotografa a etiqueta, IA lê os dados, morador recebe WhatsApp — tudo rastreado e auditável.

## Stack

Next.js 15 · App Router · MongoDB Atlas · Panda CSS · JWT (jose) · AWS S3 · Gemini Flash · Z-API · TypeScript strict

## Requisitos

- Node.js 20+
- Yarn 1.x
- MongoDB Atlas (cluster gratuito funciona)
- Conta AWS S3 (para fotos e QR codes)
- API Key do Google Gemini
- Instância Z-API (WhatsApp)

## Setup

```bash
# 1. Clonar e instalar dependências
git clone <repo>
cd encoraj
yarn install

# 2. Configurar variáveis de ambiente
cp apps/encoraj/.env.local.example apps/encoraj/.env.local
# editar .env.local com suas credenciais

# 3. Criar usuário admin inicial
cd apps/encoraj
yarn seed

# 4. Gerar o styled-system do Panda CSS
yarn panda

# 5. Rodar em desenvolvimento (da raiz)
cd ../..
yarn dev
```

Acesse: http://localhost:3000
Login padrão: `admin@encoraj.com` / `admin123`

## Variáveis de ambiente

```bash
# MongoDB
MONGODB_URI=mongodb+srv://.../<banco>?retryWrites=true&w=majority

# JWT
JWT_SECRET=<string-aleatoria-longa>

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=

# Google Gemini
GEMINI_API_KEY=

# Z-API (WhatsApp)
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

## Comandos

```bash
# Da raiz (Turborepo)
yarn dev          # sobe todos os apps
yarn build        # build completo
yarn typecheck    # tsc --noEmit em todos os pacotes
yarn lint         # eslint em todos os pacotes

# De apps/encoraj/
yarn dev          # next dev
yarn seed         # cria condomínio demo + admin inicial
yarn panda        # regenera styled-system/ após mudar tokens/receitas
```

## Estrutura do monorepo

```
apps/
  encoraj/          ← Next.js 15 app
packages/
  ui/               ← @encoraj/ui (componentes React)
  panda-config/     ← @encoraj/panda-config (tokens + receitas Panda CSS)
  tsconfig/         ← @encoraj/tsconfig (configs TypeScript compartilhadas)
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `PROJECT.md` | Problema, personas, fluxos, modelos de dados, integrações |
| `ROADMAP.md` | Fases de desenvolvimento e status atual |
| `CLAUDE.md` | Convenções de código, stack, estrutura (para o agente Claude) |
| `STYLES.md` | Design system: tokens, componentes, convenções Panda CSS |

## Roles

| Role | Acesso |
|---|---|
| `admin` | Tudo: moradores, usuários, encomendas, relatórios |
| `zelador` | CRUD de moradores |
| `porteiro` | Registrar chegadas e confirmar retiradas |
| `sindico` | Relatórios e listagens (somente leitura) |

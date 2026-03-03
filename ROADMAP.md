# Roadmap de Desenvolvimento — Encoraj

## Fase 0 — Fundação (atual)

**Objetivo**: Projeto estruturado, pronto para começar a codar.

- [x] Definir stack técnica definitiva
- [x] Documentar arquitetura, fluxos e modelos de dados (`PROJECT.md`)
- [x] Atualizar `CLAUDE.md` com stack, convenções e estrutura
- [ ] Instalar e configurar Panda CSS (substituir styled-components)
- [ ] Configurar variáveis de ambiente (`.env.local.example`)
- [ ] Conectar MongoDB Atlas (lib/db)
- [ ] Estrutura de pastas inicial (`app/`, `lib/`)

**Milestone**: `yarn dev` sobe, MongoDB conecta, Panda CSS funciona.

---

## Fase 1 — Auth e Base

**Objetivo**: Sistema de login funcional com proteção por role.

- [ ] Modelo `users` no MongoDB + índice único em `email`
- [ ] `POST /api/auth` — login com email/senha, retorna JWT
- [ ] JWT helper: gerar, verificar, extrair payload
- [ ] Middleware de autenticação (Next.js middleware.ts)
- [ ] Layout do dashboard com sidebar (rotas por role)
- [ ] Página de login (`/login`)
- [ ] Auth guard no layout do dashboard
- [ ] Script seed: criar usuário admin inicial

**Milestone**: Login funciona, dashboard protegido por role, admin consegue entrar.

---

## Fase 2 — Moradores

**Objetivo**: Admin consegue gerenciar o cadastro de moradores.

- [ ] Modelo `residents` no MongoDB
- [ ] `GET /api/residents` — listar com paginação
- [ ] `POST /api/residents` — criar morador
- [ ] `PUT /api/residents/[id]` — editar
- [ ] `DELETE /api/residents/[id]` — desativar (soft delete)
- [ ] Página `/residents` — listagem com busca
- [ ] Página `/residents/new` — formulário de criação
- [ ] Página `/residents/[id]/edit` — formulário de edição

**Milestone**: Admin cria e edita moradores completos.

---

## Fase 3 — Registro de Encomendas (núcleo)

**Objetivo**: Porteiro registra chegada de encomenda com foto e OCR.

- [ ] Configurar AWS S3 (lib/s3): upload de arquivo, gerar URL pública
- [ ] `POST /api/upload` — recebe imagem, salva no S3, retorna URL
- [ ] Configurar Gemini Flash (lib/gemini): enviar imagem, extrair JSON
- [ ] `POST /api/ocr` — recebe URL de imagem, retorna `{ name, apartment }`
- [ ] Geração de código único (6 chars alfanumérico)
- [ ] Geração de QR Code PNG (lib/qrcode) + upload para S3
- [ ] Modelo `packages` no MongoDB
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

**Objetivo**: Sistema estável e pronto para uso real.

- [ ] Tratamento de erros em todas as rotas de API (respostas padronizadas)
- [ ] Loading states e feedback visual nas ações críticas
- [ ] Validação de formulários no cliente (Zod + react-hook-form)
- [ ] Testes de fumaça dos fluxos principais
- [ ] Deploy na Vercel + configuração de variáveis de ambiente
- [ ] Seed de dados iniciais (admin + moradores de exemplo)
- [ ] Documentação de onboarding no `README.md`

**Milestone**: Sistema em produção, porteiro treinado, condomínio usando.

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

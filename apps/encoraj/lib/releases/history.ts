/**
 * Histórico de versões do app — a tela /admin/releases (só super admin) mostra daqui.
 *
 * Fica no código de propósito, como o mapa de permissões: muda junto com o código e é
 * revisado no mesmo commit. Não criar tela, rota ou coleção para editar.
 *
 * Como manter (regra no CLAUDE.md):
 *   - mudança média ou grande (funcionalidade, correção que o usuário sente, segurança,
 *     refactor amplo, atualização de dependência major) → entrada nova NO TOPO, no mesmo commit
 *   - versão: 0.MINOR.0 para funcionalidade ou mudança significativa; 0.x.PATCH para correção
 *   - `version` do apps/encoraj/package.json acompanha a release mais nova (o teste confere)
 *   - typo, kaizen pequeno e ajuste de doc não entram
 */

export type ChangeType = 'feature' | 'fix' | 'security' | 'improvement' | 'infra'

/** Rótulo de cada tipo de mudança na tela. */
export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  feature: 'Novidade',
  fix: 'Correção',
  security: 'Segurança',
  improvement: 'Melhoria',
  infra: 'Infraestrutura',
}

export interface ReleaseChange {
  type: ChangeType
  text: string
}

export interface Release {
  /** semver: "0.14.0" */
  version: string
  /** dia em que entrou, "AAAA-MM-DD" (fuso de São Paulo) */
  date: string
  title: string
  summary: string
  changes: ReleaseChange[]
  /** commits que compõem a release (hash curto); a mais nova pode não ter ainda */
  commits?: string[]
}

/** Da mais nova para a mais antiga. */
export const RELEASES: Release[] = [
  {
    version: '0.16.0',
    date: '2026-11-24',
    title: 'Destinatário fora da lista',
    summary: 'Quando a encomenda chega para alguém que não é morador cadastrado, o porteiro acha quem mora na unidade e registra para essa pessoa. Cadastrar morador continua sendo da administração.',
    changes: [
      { type: 'feature', text: 'No registro de chegada, o morador é escolhido por busca: basta digitar o nome ou a unidade ("apto 101", "bloco 2 apto 1").' },
      { type: 'improvement', text: 'Se o destinatário não está na lista, a tela orienta o porteiro: registrar para outro morador da unidade, anotando para quem é, ou interfonar.' },
      { type: 'improvement', text: 'O aviso do WhatsApp leva a observação da portaria, para o morador saber quando a encomenda é de outra pessoa da unidade.' },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-11-20',
    title: 'OCR de volta',
    summary: 'A leitura automática da etiqueta estava parada desde junho: o Google desligou o modelo usado.',
    changes: [
      { type: 'fix', text: 'O OCR volta a sugerir o morador: o modelo gemini-2.0-flash, desligado pelo Google em 1º/jun/2026, foi trocado pelo gemini-3.6-flash.' },
      { type: 'infra', text: 'OCR no SDK novo do Google (@google/genai), com tempo máximo de 15 segundos por leitura.' },
    ],
    commits: ['47ac332'],
  },
  {
    version: '0.14.0',
    date: '2026-11-20',
    title: 'Histórico de versões',
    summary: 'O app passa a guardar a própria história: cada mudança média ou grande ganha uma entrada aqui.',
    changes: [
      { type: 'feature', text: 'Tela Releases (/admin/releases), só para o super admin: o histórico desde o início e qual versão está no ar.' },
      { type: 'security', text: 'O admin criado pelo seed é obrigado a trocar a senha padrão no primeiro acesso.' },
    ],
    commits: ['12d6b45'],
  },
  {
    version: '0.13.0',
    date: '2026-11-20',
    title: 'Padronização do código',
    summary: 'Fechamento da dívida de padrão da auditoria de 19/nov: menos duplicação, nomes consistentes e telas menores. Nenhuma regra de negócio mudou.',
    changes: [
      { type: 'improvement', text: 'Unidade do morador num formato só ("Bloco A · Apto 101"), inclusive no CSV; o detalhe da encomenda passou a mostrar o bloco.' },
      { type: 'improvement', text: 'Campo de senha com mostrar/ocultar em todas as telas: login, primeiro acesso, redefinir senha, perfil, cadastro de usuário e de condomínio.' },
      { type: 'improvement', text: 'Busca de moradores dispara sozinha ao digitar, a partir de 1 caractere.' },
      { type: 'security', text: 'Fotos saíram do token de login; o cookie de sessão é emitido e apagado num lugar só.' },
      { type: 'fix', text: 'Remover foto avisa quando falha; escolher a mesma foto duas vezes seguidas volta a enviar.' },
      { type: 'infra', text: 'Respostas das rotas padronizadas, rotas sem uso removidas, nomes do código em inglês (bloco → block), corpo das rotas em snake_case e telas grandes divididas em componentes.' },
    ],
    commits: ['185fb37', 'cd3bd4f', '6dbed1d', '01eb4f0'],
  },
  {
    version: '0.12.0',
    date: '2026-11-19',
    title: 'Plataforma: super admin e administradoras',
    summary: 'O app deixa de ser de um condomínio só: o super admin opera a plataforma e administradoras cuidam de vários condomínios.',
    changes: [
      { type: 'feature', text: 'Super admin: cria condomínios e administradoras e entra em qualquer condomínio para dar suporte.' },
      { type: 'feature', text: 'Administradora: um admin cuida de vários condomínios e cria novos.' },
      { type: 'feature', text: 'Perfis somados: a mesma pessoa pode ser, por exemplo, porteiro e zelador.' },
      { type: 'feature', text: 'Telas de plataforma: erros do sistema, uso de IA (chamadas, tokens e custo estimado) e consulta de permissões.' },
      { type: 'security', text: 'Senha definida por outra pessoa obriga a troca no primeiro acesso.' },
      { type: 'security', text: 'Fim do cadastro público: usuário só nasce cadastrado por quem está acima dele.' },
    ],
    commits: ['3dc49a4'],
  },
  {
    version: '0.11.0',
    date: '2026-11-19',
    title: 'Base atualizada',
    summary: 'Dependências principais na versão atual, sem plugin abandonado no build.',
    changes: [
      { type: 'infra', text: 'Next.js 16 (o middleware virou proxy), ESLint 10, driver do MongoDB 7 e lucide 1.' },
      { type: 'infra', text: 'Service worker escrito à mão, sem cache de página (aparelho de portaria é compartilhado); saiu o plugin next-pwa, parado desde 2024.' },
      { type: 'infra', text: 'Node 22 fixado. Panda CSS 2 adiado e TypeScript 7 bloqueado pelo ecossistema.' },
    ],
    commits: ['f7c6bff', '8c34de1', 'ebf3f86'],
  },
  {
    version: '0.10.0',
    date: '2026-11-19',
    title: 'Relatório gerencial',
    summary: 'Síndico e admin passam a ter números para decidir, não só a lista de encomendas.',
    changes: [
      { type: 'feature', text: 'Relatório gerencial: chegadas, retiradas, tempo até a retirada, avisos, encomendas paradas, picos por dia e hora, unidades, blocos e equipe.' },
      { type: 'feature', text: 'Export CSV de cada seção, para levar à assembleia.' },
    ],
    commits: ['0dde5ff'],
  },
  {
    version: '0.9.0',
    date: '2026-11-17',
    title: 'Endurecimento para o lançamento',
    summary: 'Auditoria de segurança antes de abrir para condomínios reais.',
    changes: [
      { type: 'security', text: 'Fechado vazamento de dados entre condomínios: toda consulta passou a filtrar pelo condomínio.' },
      { type: 'security', text: 'Sessão revogável (desativar o usuário ou trocar a senha derruba o acesso), limite de tentativas no login e no código de retirada, uploads conferidos pelo conteúdo.' },
      { type: 'security', text: 'Link público da encomenda por token aleatório; fotos entregues só por link assinado.' },
      { type: 'feature', text: 'Listagens paginadas e export CSV das encomendas.' },
      { type: 'feature', text: 'Remoção definitiva de dados a pedido do titular (LGPD).' },
      { type: 'feature', text: 'Termos de uso e política de privacidade.' },
      { type: 'infra', text: 'Testes automatizados e CI no GitHub.' },
    ],
    commits: ['95663f3', '844b2df', '21fdd76', 'f069195'],
  },
  {
    version: '0.8.0',
    date: '2026-03-19',
    title: 'Instalar como app',
    summary: 'A portaria abre o encoraj direto da tela inicial do celular.',
    changes: [
      { type: 'feature', text: 'Botão de instalar na barra lateral (Android) e instruções para o iPhone.' },
    ],
    commits: ['34bf2dd', '3a42cde'],
  },
  {
    version: '0.7.0',
    date: '2026-03-17',
    title: 'OCR, código de retirada e busca',
    summary: 'O sistema lê a etiqueta e a retirada passa a exigir código.',
    changes: [
      { type: 'feature', text: 'OCR com Gemini: o sistema lê a foto da etiqueta e sugere o morador; o porteiro confirma.' },
      { type: 'feature', text: 'Código de retirada de 6 dígitos, enviado ao morador e conferido na entrega.' },
      { type: 'feature', text: 'Busca automática por morador ou código, filtro por período e status "em aberto".' },
      { type: 'fix', text: 'Datas e "hoje" sempre no fuso de São Paulo.' },
    ],
    commits: ['f4b2e30', '925c507', 'f48cc41'],
  },
  {
    version: '0.6.0',
    date: '2026-03-12',
    title: 'No ar na Vercel',
    summary: 'Primeira versão em produção.',
    changes: [
      { type: 'infra', text: 'Deploy em produção na Vercel.' },
      { type: 'feature', text: 'O QR code leva o porteiro direto à encomenda, passando pelo login.' },
      { type: 'feature', text: 'Confirmação antes de entregar e de excluir.' },
      { type: 'feature', text: 'Trocar e remover a foto de perfil e a do condomínio.' },
      { type: 'improvement', text: 'Mensagens de aviso ao morador revisadas.' },
    ],
    commits: ['c49e609', 'a197e3b', '3abeae2', '6d4b8f9', '1509f39'],
  },
  {
    version: '0.5.0',
    date: '2026-03-11',
    title: 'Registro de encomendas',
    summary: 'O fluxo principal da portaria: registrar, avisar e entregar.',
    changes: [
      { type: 'feature', text: 'Registrar chegada com foto da etiqueta e QR code.' },
      { type: 'feature', text: 'Aviso ao morador pelo WhatsApp, com página pública da encomenda.' },
      { type: 'feature', text: 'Perfil com foto e recuperação de senha por email (o link no login segue desligado até o SMTP de produção).' },
    ],
    commits: ['aea6e35', '8327902', '4337a6c'],
  },
  {
    version: '0.4.0',
    date: '2026-03-09',
    title: 'Acabamento e PWA',
    summary: 'Primeira rodada de acabamento das telas.',
    changes: [
      { type: 'improvement', text: 'Aviso na tela (toast) depois de cada ação.' },
      { type: 'feature', text: 'Telas de carregamento, página de erro e página não encontrada.' },
      { type: 'feature', text: 'PWA: manifesto, ícones e instalação no celular.' },
    ],
    commits: ['143652c', '005f677', 'da6aa14'],
  },
  {
    version: '0.3.0',
    date: '2026-03-06',
    title: 'Usuários e relatórios',
    summary: 'A equipe do condomínio entra no sistema.',
    changes: [
      { type: 'feature', text: 'Gestão de usuários: admin, zelador, porteiro e síndico.' },
      { type: 'feature', text: 'Configurações do condomínio e primeiro relatório de encomendas.' },
      { type: 'feature', text: 'Bloco no cadastro do morador e tema escuro.' },
    ],
    commits: ['9f2ac2b'],
  },
  {
    version: '0.2.0',
    date: '2026-03-04',
    title: 'Moradores e vários condomínios',
    summary: 'Cada condomínio vê só os próprios dados.',
    changes: [
      { type: 'feature', text: 'Cadastro de moradores.' },
      { type: 'feature', text: 'Vários condomínios no mesmo sistema, separados por condomínio.' },
      { type: 'feature', text: 'Entrega de encomenda com confirmação.' },
    ],
    commits: ['193661b', 'b1d7f8a'],
  },
  {
    version: '0.1.0',
    date: '2026-03-03',
    title: 'Fundação',
    summary: 'Onde tudo começou.',
    changes: [
      { type: 'infra', text: 'Monorepo com Next.js e MongoDB.' },
      { type: 'feature', text: 'Login com perfis de acesso.' },
    ],
    commits: ['9283624', 'bebc18b', 'fe8394b'],
  },
]

/** Versão do código: a release mais nova. */
export const APP_VERSION = RELEASES[0].version

export interface DeployInfo {
  /** "production", "preview" ou "local" */
  env: string
  /** hash curto do commit no ar, quando a Vercel informa */
  commit: string | null
  message: string | null
  branch: string | null
}

/**
 * O que está no ar agora, lido das variáveis de sistema da Vercel (automático a cada
 * deploy). Fora da Vercel, "local" sem commit.
 */
export function currentDeploy(env: Record<string, string | undefined> = process.env): DeployInfo {
  const sha = env.VERCEL_GIT_COMMIT_SHA
  return {
    env: env.VERCEL_ENV || 'local',
    commit: sha ? sha.slice(0, 7) : null,
    message: env.VERCEL_GIT_COMMIT_MESSAGE || null,
    branch: env.VERCEL_GIT_COMMIT_REF || null,
  }
}

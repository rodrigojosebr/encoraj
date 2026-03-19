# Encoraj — Guia Operacional para Usuários

## O Problema que o Encoraj Resolve

Todo condomínio vive o mesmo problema silencioso. O volume de encomendas cresceu de forma enorme nos últimos anos: compras online, delivery de farmácia, presentes, documentos — tudo chega na portaria. E a portaria, muitas vezes, ainda controla tudo isso em papel, caderninho ou mensagem de WhatsApp manual.

O resultado é caos: porteiro sem tempo, morador sem informação, síndico sem visibilidade, e encomenda parada por dias sem ninguém saber. Quando alguém vai buscar, ninguém sabe ao certo onde está, se já foi retirado ou por quem.

Os problemas mais comuns antes do Encoraj:
- Porteiro decifra etiquetas difíceis e anota o nome errado do destinatário
- Morador não sabe que tem encomenda esperando há dias
- Nenhum registro formal de quem retirou e quando
- Síndico sem visibilidade do volume e status das entregas
- Pacotes perdidos ou entregues à pessoa errada sem como rastrear

---

## O Que o Encoraj Faz

O Encoraj é um sistema web de gestão de encomendas para condomínios. Ele digitaliza o processo do início ao fim:

1. O porteiro fotografa a etiqueta da encomenda que chegou
2. A inteligência artificial lê a etiqueta e identifica automaticamente o morador destinatário
3. O porteiro confirma e registra a chegada com um toque
4. O sistema gera um código único e um QR Code para aquela encomenda
5. O porteiro notifica o morador pelo WhatsApp com a mensagem pronta, incluindo foto, código e QR Code
6. O morador recebe tudo no celular e, quando quiser, desce buscar
7. Na retirada, o porteiro valida o código PIN do morador e confirma a entrega
8. O sistema registra: quem entregou, para quem, em que data e hora

Tudo rastreado. Tudo auditável. Nada se perde.

---

## O Grande Diferencial para o Morador

**O morador não precisa instalar nenhum aplicativo. Não precisa fazer cadastro. Não precisa criar conta em lugar nenhum.**

Ele só precisa ter WhatsApp — que todo mundo já tem.

A notificação chega diretamente no WhatsApp do morador com tudo que ele precisa saber: a foto da etiqueta, o código da encomenda e o código PIN de retirada. Há também um link onde ele pode ver todos os detalhes da encomenda no navegador, sem login, sem senha, sem instalar nada.

**O condomínio usa o sistema. O morador só recebe a mensagem e vem buscar.**

---

## Rastreabilidade e Controle

Para o síndico e o administrador, o Encoraj oferece visibilidade completa em tempo real:

- Quantas encomendas chegaram hoje
- Quantas estão paradas aguardando retirada e há quantos dias
- Quantas já foram entregues
- Quem registrou cada chegada (qual porteiro, em que horário)
- Quem confirmou cada retirada (qual porteiro, em que horário)
- Se o morador foi notificado e quando

Cada ação no sistema gera um registro com data, hora e nome do responsável. Se uma encomenda sumir ou houver qualquer dúvida, é possível rastrear exatamente o que aconteceu. Isso é rastreabilidade de verdade — não depende da memória do porteiro nem de caderninho.

---

## Quem Usa o Sistema

### Administrador
Gerencia tudo: cadastra moradores, cria contas de porteiros e zeladores, configura o condomínio, acompanha encomendas e acessa relatórios completos. É o responsável pela implantação inicial.

### Porteiro
Usa o sistema no dia a dia. Registra a chegada das encomendas, notifica os moradores pelo WhatsApp e confirma as retiradas. Precisa de uma interface rápida — é o usuário que mais interage com o sistema.

### Zelador
Responsável apenas pelo cadastro de moradores: criar, editar e desativar registros. Não acessa encomendas nem relatórios.

### Síndico
Acesso somente leitura: vê relatórios, indicadores e histórico de encomendas. Não edita nada.

### Morador
Não usa o sistema diretamente. Recebe notificação no WhatsApp com foto da encomenda, código de retirada e QR Code. Sem cadastro, sem app, sem login.

---

## Como Funciona na Prática — Fluxo Completo

### Chegada da Encomenda
```
Entregador deixa a encomenda na portaria
  → Porteiro abre o app e toca "Registrar chegada"
  → Fotografa a etiqueta com a câmera do celular (ou faz upload de foto)
  → IA analisa a etiqueta e sugere o morador destinatário
  → Porteiro confirma (ou corrige manualmente se necessário)
  → Sistema registra: código único gerado, QR Code gerado, foto salva
  → Encomenda aparece na listagem com status "Chegou" (azul)
```

### Notificação do Morador
```
  → Porteiro abre a encomenda na listagem
  → Clica em "Notificar via WhatsApp"
  → WhatsApp abre com mensagem pronta (nome, condomínio, código, link)
  → Porteiro envia — leva 5 segundos
  → Sistema registra: notificado em [data/hora]
  → Status muda para "Notificado" (âmbar)

O morador recebe no celular:
  → Mensagem com foto da etiqueta
  → Código da encomenda (ex: A3K7X2)
  → PIN de 6 dígitos para retirada
  → Link para ver a encomenda no navegador (sem login)
```

### Retirada da Encomenda
```
Morador chega à portaria
  → Apresenta o QR Code na tela do celular (aberto pelo link do WhatsApp)
  → Porteiro escaneia o QR Code → sistema abre direto a encomenda
    (alternativa: porteiro busca pelo nome ou código na listagem)
  → Porteiro clica "Confirmar entrega"
  → Dialog pede o PIN de 6 dígitos
  → Morador informa o PIN → porteiro digita → confirma
  → Sistema registra: entregue em [data/hora] por [nome do porteiro]
  → Status muda para "Retirado" (verde)
```

---

## Passo a Passo: Administrador

### 1. Criar a conta do condomínio (feito uma única vez)

Acesse o endereço do sistema no navegador. Na tela de login, clique em "Criar conta". Preencha:
- Nome do condomínio (ex: Residencial Bela Vista)
- Seu nome completo
- E-mail e senha

O sistema cria o condomínio e a conta de administrador automaticamente. O login já acontece na sequência.

> Este cadastro é feito uma única vez. Todos os outros usuários são criados pelo administrador depois.

### 2. Configurar o condomínio

Após o primeiro login, acesse "Configurações" no menu lateral:

- **Nome do condomínio**: confirme ou corrija o nome cadastrado. É esse nome que aparece nas mensagens enviadas aos moradores.
- **Foto do condomínio**: clique no avatar do condomínio no topo da sidebar ou na página de Configurações. Selecione uma imagem. A foto aparece para todos os usuários na hora. Para remover, clique no ícone de lixeira.

### 3. Cadastrar moradores

O cadastro de moradores é a base do sistema. Sem moradores cadastrados, não é possível registrar encomendas.

**Para cadastrar:**
1. Clique em "Moradores" no menu
2. Clique em "Novo morador"
3. Preencha:
   - Nome completo
   - Número do apartamento (ex: 101, 5B)
   - Bloco ou Torre (opcional, se o condomínio tiver)
   - WhatsApp no formato internacional: +55 11 99999-9999
4. Clique em "Salvar"

**Para editar:** clique no ícone de lápis ao lado do nome na listagem.

**Para desativar** (morador que saiu do condomínio): clique no ícone de lixeira e confirme. O morador some da lista principal mas o histórico de encomendas dele fica preservado. É possível restaurar a qualquer momento clicando em "Mostrar excluídos" e usando o botão de restaurar.

### 4. Criar usuários (porteiros, zeladores, síndico)

Apenas o administrador pode criar outros usuários.

**Para criar:**
1. Clique em "Usuários" no menu
2. Clique em "Novo usuário"
3. Preencha:
   - Nome completo
   - E-mail (usado para login)
   - Senha provisória (o usuário pode alterar depois)
   - Perfil: Porteiro, Zelador ou Síndico
4. Clique em "Salvar"

O novo usuário já pode fazer login imediatamente.

**Para desativar** (porteiro que saiu do condomínio): clique no ícone de lixeira. O acesso é revogado na hora.

> Dica de segurança: nunca compartilhe senhas entre usuários. Cada porteiro deve ter seu próprio login — assim é possível rastrear quem registrou cada encomenda e quem confirmou cada retirada.

### 5. Acompanhar encomendas

A página inicial (Dashboard) mostra em tempo real:
- Encomendas chegadas hoje
- Encomendas em aberto (aguardando retirada)
- Retiradas hoje

Cada card é clicável e abre a listagem filtrada por aquele status.

A página "Encomendas" mostra a lista completa com:
- **Azul** = Chegou (aguardando notificação)
- **Âmbar** = Notificado (morador avisado, aguardando retirada)
- **Verde** = Retirado
- Campo de busca por nome do morador ou código da encomenda
- Filtros por status

### 6. Relatórios

A página "Relatórios" mostra indicadores e histórico completo com a timeline de cada encomenda:
- Ícone de caixa = data/hora de chegada
- Ícone de sino = data/hora da notificação
- Ícone de check verde = data/hora da retirada

**Filtros disponíveis:**
- Por status: Chegou / Notificado / Retirado
- Por período: data de início e fim
- Por nome do morador

**Exportação:** clique em "Exportar CSV" para baixar os dados em formato compatível com Excel — útil para relatórios de assembleia ou controles internos.

O síndico acessa exatamente esta mesma página, sem poder editar nada.

---

## Passo a Passo: Porteiro

### 1. Acessar o sistema

O administrador fornece o e-mail e a senha de acesso.

**No computador da portaria:** abra o navegador e acesse o endereço do sistema.

**No celular:** o Encoraj pode ser instalado direto do navegador como um aplicativo, sem precisar da loja de apps.
- **Android:** ao abrir o site, aparece automaticamente o botão "Instalar app". Toque e confirme.
- **iPhone:** abra no Safari, toque no botão de compartilhar (seta para cima), escolha "Adicionar à Tela de Início".

Após instalar, o ícone aparece na tela inicial do celular como qualquer outro app.

### 2. Registrar a chegada de uma encomenda

Esta é a ação central do dia a dia do porteiro.

1. Clique em "Encomendas" no menu
2. Clique em "Registrar chegada"
3. Fotografe a etiqueta da encomenda usando a câmera do celular, ou selecione uma foto da galeria
4. O sistema analisa a etiqueta com inteligência artificial:
   - **Alta confiança:** aparece um card azul com o nome sugerido. Confirme se estiver correto, ou toque em "Não é este" para escolher manualmente.
   - **Baixa confiança ou não reconheceu:** selecione o morador manualmente na lista. Use a busca por nome ou apartamento.
5. Revise os dados do destinatário
6. Adicione uma observação se necessário (ex: "caixa amassada", "envelope pequeno")
7. Clique em "Registrar chegada"

O sistema gera automaticamente o código único e o QR Code. A encomenda aparece na listagem com status azul "Chegou".

> Se a câmera não estiver disponível ou a etiqueta estiver muito danificada: use a opção de seleção manual e busque o morador pelo nome ou apartamento.

### 3. Notificar o morador

Logo após registrar, avise o morador.

1. Na listagem, clique no ícone de olho para abrir a encomenda
2. Clique em "Notificar via WhatsApp"
3. O WhatsApp abre com a mensagem já pronta — não precisa digitar nada
4. Envie a mensagem

O morador recebe:
- Nome do condomínio e mensagem de aviso
- Código da encomenda (ex: A3K7X2)
- PIN de retirada (6 dígitos numéricos)
- Link para ver a encomenda no navegador com foto e QR Code

Se precisar reenviar depois: o botão mostrará "Notificado em [data] · Reenviar".

### 4. Confirmar a retirada

Quando o morador chega à portaria:

**Via QR Code (mais rápido):**
- O morador mostra o QR Code na tela do celular (disponível no link que recebeu)
- O porteiro escaneia com a câmera → o sistema abre direto na encomenda
- Se não estiver logado, o sistema pede login e volta automaticamente à encomenda

**Via busca:**
- Na listagem de encomendas, busque pelo nome do morador ou pelo código (ex: A3K7X2)
- Clique na encomenda para abrir

**Para confirmar:**
1. Clique em "Confirmar entrega"
2. Digite o PIN de 6 dígitos que o morador apresentar
3. Clique em "Confirmar"

O sistema registra a entrega com data, hora e nome do porteiro. Status muda para verde "Retirado".

> Não confirme a entrega sem o PIN. O PIN garante que a encomenda foi entregue à pessoa certa.

### 5. Monitorar o dia a dia

**Ao iniciar o turno:**
- Veja o Dashboard: quantas encomendas estão em aberto
- Verifique se há encomendas azuis (chegaram mas o morador ainda não foi notificado) — notifique logo

**Durante o turno:**
- Azul = chegou, precisa notificar
- Âmbar = notificado, aguardando o morador buscar
- Verde = entregue, nenhuma ação necessária

**Ao encerrar o turno:**
- Confirme que todas as encomendas chegadas foram notificadas
- O próximo turno não ficará na dúvida sobre o que já foi avisado

---

## Perfil e Senha

Todos os usuários podem acessar o próprio perfil clicando em "Meu perfil" no menu lateral.

No perfil é possível:
- Ver nome e e-mail cadastrados
- Adicionar ou trocar foto de perfil (aparece na sidebar para o próprio usuário)
- Alterar a senha: informe a senha atual e a nova senha, confirme

Se o porteiro esquecer a senha: use o link "Esqueci minha senha" na tela de login para receber um e-mail de redefinição — sem precisar do administrador.

---

## Resumo dos Benefícios

| Para o porteiro | Para o morador | Para o síndico / admin |
|---|---|---|
| Registra chegada em segundos com foto | Recebe aviso no WhatsApp sem instalar app | Visibilidade completa em tempo real |
| IA identifica o destinatário automaticamente | Vê foto da encomenda e código no celular | Histórico rastreável de cada encomenda |
| QR Code agiliza a confirmação da retirada | Não precisa criar conta nem fazer login | Exportação de relatórios em CSV |
| Registro automático de cada ação | Apresenta PIN na retirada — seguro e simples | Sabe quem entregou, quando e para quem |

import type { Metadata } from 'next'
import { legalInfo } from '@/lib/legal/terms'
import { LegalPage, linkCss, List, Section } from '../_components/LegalPage'

export const metadata: Metadata = { title: 'Política de Privacidade — Encoraj' }

export default function PrivacyPage() {
  const { companyName, contactEmail } = legalInfo()

  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta Política explica como o Encoraj, operado por {companyName}, trata dados pessoais, de acordo com a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ela vale para quem administra ou opera o sistema e
        para os moradores cujas encomendas são registradas nele.
      </p>

      <Section title="1. Quem é responsável pelos dados">
        <List
          items={[
            <>
              <strong>Dados dos moradores</strong> (nome, unidade, telefone, encomendas): o <strong>condomínio</strong>{' '}
              é o controlador — é ele quem decide cadastrar o morador e usar o sistema. O Encoraj é o{' '}
              <strong>operador</strong>: trata esses dados em nome do condomínio, apenas para prestar o serviço.
            </>,
            <>
              <strong>Dados das contas de acesso</strong> (administrador, síndico, zelador, porteiro): o Encoraj é o
              controlador, pois precisa deles para autenticar e manter o serviço seguro.
            </>,
          ]}
        />
      </Section>

      <Section title="2. Quais dados tratamos">
        <List
          items={[
            <><strong>Moradores:</strong> nome, apartamento, bloco e número de WhatsApp, cadastrados pelo condomínio.</>,
            <>
              <strong>Encomendas:</strong> foto da etiqueta (que pode trazer nome, endereço e dados do remetente),
              código, datas de chegada, aviso e retirada, observações do porteiro e quem registrou cada etapa.
            </>,
            <><strong>Contas de acesso:</strong> nome, email, senha (armazenada de forma irreversível), perfil de acesso e foto de perfil opcional.</>,
            <><strong>Condomínio:</strong> nome e logotipo opcional.</>,
            <>
              <strong>Registros técnicos:</strong> endereço IP para limitar tentativas de acesso, e histórico de ações
              (quem criou, alterou ou excluiu um registro, e quando).
            </>,
          ]}
        />
        <p>Não coletamos dados sensíveis nem usamos os dados para publicidade ou criação de perfis.</p>
      </Section>

      <Section title="3. Para que usamos e com que base legal">
        <List
          items={[
            'Registrar encomendas, avisar o morador e controlar a retirada — execução do serviço contratado pelo condomínio e legítimo interesse do condomínio e do morador na entrega segura da encomenda.',
            'Autenticar usuários e proteger as contas — execução de contrato e segurança.',
            'Manter histórico de ações para apurar erros e uso indevido — legítimo interesse e prevenção a fraudes.',
            'Cumprir obrigações legais, quando houver.',
          ]}
        />
      </Section>

      <Section title="4. Link de acompanhamento da encomenda">
        <p>
          O aviso enviado ao morador contém um link individual, difícil de adivinhar, que mostra a foto da etiqueta e
          o código de retirada daquela encomenda. Quem tiver o link consegue ver essas informações — não o
          encaminhe a terceiros. A página não é indexada por buscadores.
        </p>
      </Section>

      <Section title="5. Com quem compartilhamos">
        <p>Os dados não são vendidos. Eles passam por prestadores que viabilizam o serviço, apenas para esse fim:</p>
        <List
          items={[
            'hospedagem da aplicação (Vercel);',
            'banco de dados (MongoDB Atlas);',
            'armazenamento das fotos (Amazon Web Services — S3);',
            'leitura automática da etiqueta (Google Gemini), que recebe a foto e a lista de moradores do próprio condomínio para sugerir o destinatário;',
            'envio de email de redefinição de senha, quando solicitado;',
            'alerta de falhas técnicas à equipe do Encoraj, que recebe apenas a descrição do erro — sem nome, telefone, email ou foto de morador.',
          ]}
        />
        <p>
          Alguns desses prestadores processam dados fora do Brasil. Nesses casos a transferência ocorre com as
          garantias previstas na LGPD. O WhatsApp é usado pelo próprio porteiro, a partir do aparelho dele, e segue
          os termos do WhatsApp.
        </p>
      </Section>

      <Section title="6. Por quanto tempo guardamos">
        <p>
          Os dados ficam armazenados enquanto o condomínio usar o serviço, para que o histórico de encomendas possa
          ser consultado. Não há exclusão automática por prazo: a remoção acontece a pedido do titular ou do
          condomínio, como descrito abaixo. Cadastros “excluídos” na tela do sistema ficam apenas ocultos e podem
          ser restaurados; a remoção definitiva é um procedimento à parte.
        </p>
      </Section>

      <Section title="7. Seus direitos">
        <p>Você pode, a qualquer momento:</p>
        <List
          items={[
            'confirmar se tratamos seus dados e acessá-los;',
            'corrigir dados incompletos ou desatualizados;',
            'pedir a exclusão definitiva dos seus dados;',
            'saber com quem os dados foram compartilhados;',
            'opor-se ao tratamento ou pedir sua limitação, nos casos previstos em lei.',
          ]}
        />
        <p>
          <strong>Morador:</strong> faça o pedido à administração do seu condomínio, que é quem controla o cadastro.
          {contactEmail ? (
            <>
              {' '}Se preferir, ou se não for atendido, escreva para{' '}
              <a href={`mailto:${contactEmail}`} className={linkCss}>{contactEmail}</a>.
            </>
          ) : null}
        </p>
        <p>
          A exclusão definitiva de um morador só é feita depois que todas as encomendas dele tiverem sido
          retiradas. Nela são apagados o cadastro, as fotos de etiqueta e os códigos das
          encomendas dele e as observações. O registro de que uma encomenda existiu é mantido sem identificação,
          apenas para estatística do condomínio. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </Section>

      <Section title="8. Segurança">
        <List
          items={[
            'cada condomínio acessa apenas os próprios dados;',
            'senhas são armazenadas com algoritmo de hash e nunca em texto;',
            'o acesso exige autenticação e é limitado pelo perfil de cada usuário;',
            'as fotos são entregues por links temporários;',
            'ações de criação, alteração e exclusão ficam registradas.',
          ]}
        />
        <p>
          Nenhum sistema é totalmente imune a incidentes. Havendo incidente que possa causar risco ou dano
          relevante, os condomínios afetados e a ANPD serão comunicados, como determina a lei.
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          Usamos apenas um cookie essencial, que mantém a sessão de quem fez login, e armazenamento local para
          lembrar preferências de aparência. Não usamos cookies de publicidade ou de rastreamento.
        </p>
      </Section>

      <Section title="10. Alterações e contato">
        <p>
          Esta Política pode ser atualizada; a versão vigente fica nesta página, com a data no topo.
          {contactEmail ? (
            <>
              {' '}Para dúvidas ou pedidos sobre dados pessoais, fale com o encarregado pelo tratamento de dados:{' '}
              <a href={`mailto:${contactEmail}`} className={linkCss}>{contactEmail}</a>.
            </>
          ) : null}
        </p>
      </Section>
    </LegalPage>
  )
}

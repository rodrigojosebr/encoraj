import type { Metadata } from 'next'
import Link from 'next/link'
import { legalInfo } from '@/lib/legal/terms'
import { LegalPage, linkCss, List, Section } from '../_components/LegalPage'

export const metadata: Metadata = { title: 'Termos de Uso — Encoraj' }

export default function TermsPage() {
  const { companyName, contactEmail } = legalInfo()

  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes Termos regulam o uso do Encoraj, sistema de gestão de encomendas para condomínios operado por{' '}
        {companyName} (“Encoraj”, “nós”). Ao criar uma conta, você declara que leu e aceita estes Termos e a{' '}
        <Link href="/privacidade" className={linkCss}>Política de Privacidade</Link>.
      </p>

      <Section title="1. O que é o serviço">
        <p>
          O Encoraj permite que a portaria registre a chegada de encomendas, identifique o destinatário, avise o
          morador e registre a retirada. O serviço é uma ferramenta de apoio: a guarda física das encomendas e a
          conferência de quem as retira continuam sendo responsabilidade do condomínio.
        </p>
      </Section>

      <Section title="2. Quem pode usar">
        <List
          items={[
            'A conta é criada por alguém com poderes para representar o condomínio (síndico, administradora ou pessoa por eles autorizada). Ao se cadastrar, você declara ter essa autorização.',
            'O administrador da conta cria e remove os acessos da equipe (porteiros, zeladores, síndico) e responde pelo uso que essas pessoas fazem do sistema.',
            'Cada acesso é pessoal. Não compartilhe senha; avise o administrador se suspeitar de uso indevido.',
          ]}
        />
      </Section>

      <Section title="3. Responsabilidades do condomínio">
        <List
          items={[
            'Cadastrar apenas moradores do próprio condomínio e manter os dados corretos e atualizados.',
            'Informar os moradores de que seus dados (nome, unidade, telefone e foto da etiqueta das encomendas) são tratados no Encoraj para a gestão de encomendas.',
            'Atender os pedidos dos moradores sobre seus dados pessoais, usando os recursos do sistema ou acionando o Encoraj.',
            'Não usar o serviço para fim diferente da gestão de encomendas, nem para enviar mensagens não relacionadas a elas.',
            'Desativar o acesso de quem deixar de trabalhar no condomínio.',
          ]}
        />
      </Section>

      <Section title="4. Uso aceitável">
        <p>Não é permitido:</p>
        <List
          items={[
            'tentar acessar dados de outro condomínio ou contornar os controles de acesso;',
            'usar o sistema de forma automatizada que prejudique o serviço para os demais;',
            'inserir conteúdo ilícito, ofensivo ou que viole direitos de terceiros;',
            'revender ou sublicenciar o acesso sem autorização.',
          ]}
        />
        <p>Contas que violarem estas regras podem ser suspensas ou encerradas.</p>
      </Section>

      <Section title="5. Mensagens por WhatsApp">
        <p>
          O aviso ao morador é enviado pelo WhatsApp do próprio porteiro, que abre com a mensagem pronta. O Encoraj
          não envia mensagens em nome do condomínio nem garante a entrega: ela depende do WhatsApp e do número
          cadastrado.
        </p>
      </Section>

      <Section title="6. Leitura automática de etiquetas">
        <p>
          A foto da etiqueta é analisada por um serviço de inteligência artificial para sugerir o destinatário. É
          uma sugestão: o porteiro deve conferir antes de confirmar. O Encoraj não responde por entrega feita à
          pessoa errada em razão de sugestão aceita sem conferência.
        </p>
      </Section>

      <Section title="7. Disponibilidade e limites de responsabilidade">
        <List
          items={[
            'Trabalhamos para manter o serviço disponível, mas ele pode ficar fora do ar por manutenção ou falha de terceiros (hospedagem, banco de dados, armazenamento). Não há garantia de disponibilidade ininterrupta.',
            'O Encoraj não responde por extravio, dano ou furto de encomendas, que estão sob guarda do condomínio.',
            'Na medida permitida pela lei, nossa responsabilidade se limita a danos diretos comprovadamente causados por falha do serviço.',
          ]}
        />
      </Section>

      <Section title="8. Dados pessoais">
        <p>
          O tratamento de dados pessoais está descrito na{' '}
          <Link href="/privacidade" className={linkCss}>Política de Privacidade</Link>, que faz parte destes Termos.
          Em resumo: quanto aos dados dos moradores, o condomínio é o controlador e o Encoraj é o operador, tratando
          os dados apenas para prestar o serviço.
        </p>
      </Section>

      <Section title="9. Encerramento">
        <p>
          O condomínio pode deixar de usar o serviço a qualquer momento e pedir a exclusão definitiva dos seus
          dados. A exclusão é irreversível e alcança cadastros, encomendas, fotos e histórico.
        </p>
      </Section>

      <Section title="10. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos. A versão vigente fica sempre nesta página, com a data no topo. Mudanças
          relevantes serão comunicadas aos administradores das contas. Continuar usando o serviço depois da
          alteração significa concordância com a nova versão.
        </p>
      </Section>

      <Section title="11. Lei aplicável e contato">
        <p>
          Estes Termos são regidos pelas leis brasileiras.
          {contactEmail ? (
            <>
              {' '}Dúvidas: <a href={`mailto:${contactEmail}`} className={linkCss}>{contactEmail}</a>.
            </>
          ) : null}
        </p>
      </Section>
    </LegalPage>
  )
}

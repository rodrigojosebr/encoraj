/**
 * Versão dos Termos de Uso e da Política de Privacidade (data da última alteração).
 * Mudou o texto de app/(legal)/termos ou app/(legal)/privacidade? Atualize aqui —
 * a data aparece no topo dos dois documentos.
 */
export const TERMS_VERSION = '2026-11-19'

export interface LegalInfo {
  /** Quem opera o Encoraj (razão social ou nome) */
  companyName: string
  /** CNPJ/CPF de quem opera — só aparece se configurado */
  companyDoc: string | null
  /** Canal para dúvidas e pedidos sobre dados pessoais — só aparece se configurado */
  contactEmail: string | null
}

/** Identificação exibida nos documentos legais, vinda do ambiente (nada fixo no código). */
export function legalInfo(): LegalInfo {
  return {
    companyName: process.env.LEGAL_COMPANY_NAME?.trim() || 'Encoraj',
    companyDoc: process.env.LEGAL_COMPANY_DOC?.trim() || null,
    contactEmail: process.env.LEGAL_CONTACT_EMAIL?.trim() || null,
  }
}

/** '2026-11-17' → '17/11/2026' */
export function formatTermsVersion(version = TERMS_VERSION): string {
  const [year, month, day] = version.split('-')
  return `${day}/${month}/${year}`
}

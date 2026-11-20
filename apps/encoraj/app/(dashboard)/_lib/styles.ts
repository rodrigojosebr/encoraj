import { css } from '@/styled-system/css'

/**
 * Estilos repetidos das páginas do dashboard (Server e Client Components).
 * Variação de uma tela só fica na própria tela.
 */

/** Cartão branco com borda (escuro no tema escuro), conteúdo em coluna. */
export const cardCss = css({
  bg: 'white',
  border: '1px solid',
  borderColor: 'gray.200',
  borderRadius: 'lg',
  p: { base: '4', md: '6' },
  display: 'flex',
  flexDir: 'column',
  gap: '4',
  _dark: { bg: 'gray.900', borderColor: 'gray.700' },
})

export const h1Css = css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })
export const h2Css = css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })

/** Texto de apoio. */
export const mutedCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })

/** Rótulo pequeno em caixa alta, acima de um valor ou número. */
export const labelCss = css({
  fontSize: 'xs',
  fontWeight: 'semibold',
  color: 'gray.500',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
  _dark: { color: 'gray.400' },
})
export const valueCss = css({ fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })

/** Cabeçalho e célula das tabelas compactas (relatório gerencial, super admin). */
export const thCss = css({
  textAlign: 'left',
  px: '3',
  py: '2',
  fontSize: 'xs',
  fontWeight: 'semibold',
  color: 'gray.500',
  textTransform: 'uppercase',
  _dark: { color: 'gray.400' },
})
export const tdCss = css({
  px: '3',
  py: '2',
  fontSize: 'sm',
  color: 'gray.800',
  borderTop: '1px solid',
  borderColor: 'gray.100',
  _dark: { color: 'gray.200', borderColor: 'gray.800' },
})

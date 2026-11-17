import { Download } from 'lucide-react'
import { css } from '@/styled-system/css'

/** Baixa o CSV de todas as encomendas do filtro atual (não só a página exibida). */
export default function ExportCSV({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className={css({
        px: '4',
        py: '2',
        fontSize: 'sm',
        fontWeight: 'medium',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'gray.300',
        bg: 'white',
        color: 'gray.700',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2',
        textDecoration: 'none',
        _hover: { bg: 'gray.50', borderColor: 'gray.400' },
        _dark: {
          bg: 'gray.800',
          borderColor: 'gray.600',
          color: 'gray.200',
          _hover: { bg: 'gray.700' },
        },
      })}
    >
      <Download size={16} /> Exportar CSV
    </a>
  )
}

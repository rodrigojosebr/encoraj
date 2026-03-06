'use client'

import { css } from '@/styled-system/css'

interface Row {
  codigo: string
  morador: string
  apartamento: string
  status: string
  chegada: string
  notificado: string
  retirado: string
}

export default function ExportCSV({ rows }: { rows: Row[] }) {
  function handleExport() {
    const cols = ['Código', 'Morador', 'Apartamento', 'Status', 'Chegada', 'Notificado', 'Retirado']
    const lines = [
      cols.join(';'),
      ...rows.map((r) =>
        [r.codigo, r.morador, r.apartamento, r.status, r.chegada, r.notificado, r.retirado]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(';')
      ),
    ]
    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `encomendas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
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
        _hover: { bg: 'gray.50', borderColor: 'gray.400' },
        _dark: {
          bg: 'gray.800',
          borderColor: 'gray.600',
          color: 'gray.200',
          _hover: { bg: 'gray.700' },
        },
      })}
    >
      Exportar CSV
    </button>
  )
}

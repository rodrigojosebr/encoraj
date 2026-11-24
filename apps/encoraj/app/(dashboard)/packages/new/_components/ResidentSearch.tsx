'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Input } from '@encoraj/ui'
import { searchResidents, type SearchableResident } from '@/lib/residents/search'
import { mutedCss } from '@/app/(dashboard)/_lib/styles'

/** Morador como a página manda: id, texto pronto para mostrar e os campos da busca. */
export interface ResidentChoice extends SearchableResident {
  value: string
  label: string
}

/** Resultados à vista; passou disso, o porteiro afina a busca digitando mais. */
const MAX_RESULTS = 8

interface ResidentSearchProps {
  residents: ResidentChoice[]
  onSelect: (id: string) => void
}

/**
 * Busca do morador por nome ou unidade. O porteiro não cadastra morador: quando o
 * destinatário não está na lista, a orientação é registrar para alguém da unidade ou interfonar.
 */
export default function ResidentSearch({ residents, onSelect }: ResidentSearchProps) {
  const [query, setQuery] = useState('')

  const matches = searchResidents(residents, query)
  const shown = matches?.slice(0, MAX_RESULTS) ?? []
  const hidden = (matches?.length ?? 0) - shown.length

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    // Enter na busca não registra a encomenda; com um resultado só, escolhe
    e.preventDefault()
    if (matches?.length === 1) onSelect(matches[0].value)
  }

  if (residents.length === 0) {
    return <p className={mutedCss}>Este condomínio ainda não tem morador cadastrado. Peça o cadastro à administração.</p>
  }

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <div className={css({ position: 'relative' })}>
        <Search
          size={16}
          aria-hidden
          className={css({ position: 'absolute', left: '3', top: '50%', transform: 'translateY(-50%)', color: 'gray.400', pointerEvents: 'none' })}
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome ou unidade: Ana, apto 101, bloco 2 apto 1"
          aria-label="Buscar morador por nome ou unidade"
          autoComplete="off"
          enterKeyHint="search"
          className={css({ pl: '9' })}
        />
      </div>

      {shown.length > 0 && (
        <ul
          className={css({
            listStyle: 'none', p: '0', m: '0',
            border: '1px solid', borderColor: 'gray.200', borderRadius: 'md', overflow: 'hidden',
            _dark: { borderColor: 'gray.700' },
          })}
        >
          {shown.map((resident) => (
            <li
              key={resident.value}
              className={css({ borderTop: '1px solid', borderColor: 'gray.100', _first: { borderTop: 'none' }, _dark: { borderColor: 'gray.800' } })}
            >
              <button
                type="button"
                onClick={() => onSelect(resident.value)}
                className={css({
                  w: 'full', textAlign: 'left', px: '3', py: '3', fontSize: 'sm', cursor: 'pointer',
                  bg: 'white', color: 'gray.900',
                  _hover: { bg: 'blue.50' },
                  _focusVisible: { bg: 'blue.50', outline: '2px solid', outlineColor: 'blue.500', outlineOffset: '-2px' },
                  _dark: { bg: 'gray.900', color: 'gray.100', _hover: { bg: 'gray.800' }, _focusVisible: { bg: 'gray.800' } },
                })}
              >
                {resident.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className={mutedCss}>
          Mais {hidden} {hidden === 1 ? 'morador' : 'moradores'}. Continue digitando para afinar a busca.
        </p>
      )}

      {matches?.length === 0 && (
        <p className={css({ fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>
          Ninguém encontrado com esse nome ou unidade.
        </p>
      )}

      <details
        open={matches?.length === 0}
        className={css({
          fontSize: 'sm', px: '3', py: '2', borderRadius: 'md',
          bg: 'gray.50', border: '1px solid', borderColor: 'gray.200', color: 'gray.700',
          _dark: { bg: 'gray.800', borderColor: 'gray.700', color: 'gray.300' },
        })}
      >
        <summary className={css({ cursor: 'pointer', fontWeight: 'medium' })}>O destinatário não está na lista?</summary>
        <p className={css({ mt: '2' })}>
          Busque pela unidade e registre para outro morador de lá, anotando nas observações para quem é a encomenda. Ou
          interfone para a unidade.
        </p>
        <p className={css({ mt: '1' })}>Morador novo é cadastrado pela administração do condomínio.</p>
      </details>
    </div>
  )
}

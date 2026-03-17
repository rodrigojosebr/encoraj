import Link from 'next/link'
import { css } from '@/styled-system/css'
import ResidentForm from '../_components/ResidentForm'

export default function NewResidentPage() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <Link
          href="/residents"
          className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
        >
          ← Moradores
        </Link>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '2', _dark: { color: 'gray.50' } })}>
          Novo morador
        </h1>
      </div>

      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          p: { base: '4', md: '6' },
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        <ResidentForm />
      </div>
    </div>
  )
}

import { headers } from 'next/headers'
import { css } from '@/styled-system/css'

export default async function DashboardPage() {
  const headersList = await headers()
  const name = headersList.get('x-user-name')
  const role = headersList.get('x-user-role')

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
          Olá, {name}
        </h1>
        <p className={css({ fontSize: 'sm', color: 'gray.500', mt: '1' })}>
          {role === 'admin' && 'Administrador'}
          {role === 'porteiro' && 'Porteiro'}
          {role === 'sindico' && 'Síndico'}
        </p>
      </div>

      <div
        className={css({
          bg: 'blue.50',
          border: '1px solid',
          borderColor: 'blue.200',
          borderRadius: 'lg',
          p: '6',
          color: 'blue.800',
          fontSize: 'sm',
        })}
      >
        Sistema funcionando. Em breve os indicadores aparecerão aqui.
      </div>
    </div>
  )
}

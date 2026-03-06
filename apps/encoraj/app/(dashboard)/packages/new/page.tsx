import { css } from '@/styled-system/css'
import { Alert } from '@encoraj/ui'

export default function NewPackagePage() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '480px' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
        Registrar chegada
      </h1>
      <Alert variant="warning" title="Em construção">
        O registro de encomendas via foto e OCR será implementado após a configuração do AWS S3 e Google Gemini.
      </Alert>
    </div>
  )
}

'use client'

import { useCallback, useSyncExternalStore } from 'react'

const CHANGE_EVENT = 'encoraj-local-storage'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange) // outra aba
  window.addEventListener(CHANGE_EVENT, onChange) // esta aba
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // navegação privada pode bloquear o localStorage
  }
}

/**
 * Valor de uma chave do localStorage como estado do React.
 *
 * No servidor e na hidratação o valor é `null`; logo depois o React troca pelo valor
 * real do navegador. É o jeito de ler o localStorage sem `setState` dentro de efeito.
 */
export function useLocalStorage(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )

  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key)
        else localStorage.setItem(key, next)
      } catch {
        // sem localStorage a preferência só não é lembrada
      }
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [key],
  )

  return [value, setValue]
}

const noSubscription = () => () => {}

/**
 * Valor que só existe no navegador e não muda durante a sessão (user agent, modo de
 * exibição). `fallback` é o que vale no servidor e na hidratação.
 */
export function useClientValue<T extends string | number | boolean>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noSubscription, read, () => fallback)
}

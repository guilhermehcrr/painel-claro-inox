/**
 * O n8n pode gravar jsonb como texto se alguém deixar JSON.stringify no insert.
 * Aceita os dois jeitos em vez de quebrar a tela.
 */
export function comoObjeto<T>(v: T | string | null | undefined): T | null {
  if (v == null) return null
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v) as T
  } catch {
    return null
  }
}

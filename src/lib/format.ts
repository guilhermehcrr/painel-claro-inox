export const brl = (v: number | null | undefined) =>
  'R$ ' +
  Number(v ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function desde(iso: string | null | undefined) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

/** 5511933557590 -> (11) 93355-7590 */
export function telefoneBonito(t: string | null | undefined) {
  const n = String(t ?? '').replace(/\D/g, '')
  const m = n.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n
}

const fuso = { timeZone: 'America/Sao_Paulo' } as const
const diaChave = (d: Date) => d.toLocaleDateString('pt-BR', fuso)

/** 14:32 */
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { ...fuso, hour: '2-digit', minute: '2-digit' })

/** Hoje · Ontem · 12/10/2026 */
export function rotuloDia(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 86400000)
  if (diaChave(d) === diaChave(hoje)) return 'Hoje'
  if (diaChave(d) === diaChave(ontem)) return 'Ontem'
  return diaChave(d)
}

/** Na lista: hora se for hoje, "Ontem", ou a data curta */
export function quandoNaLista(iso: string | null | undefined) {
  if (!iso) return ''
  const r = rotuloDia(iso)
  if (r === 'Hoje') return hora(iso)
  if (r === 'Ontem') return 'Ontem'
  return new Date(iso).toLocaleDateString('pt-BR', { ...fuso, day: '2-digit', month: '2-digit' })
}

export const mesmoDia = (a: string, b: string) => diaChave(new Date(a)) === diaChave(new Date(b))

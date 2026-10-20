/**
 * Datas "de calendário" (YYYY-MM-DD), sem hora: data de entrega e data do caixa.
 * Tudo em UTC por dentro para não escorregar um dia por causa do fuso.
 */

const FUSO = 'America/Sao_Paulo'

/** Hoje em São Paulo, como YYYY-MM-DD */
export function hojeISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date())
}

/** Timestamp do banco (UTC) -> dia em São Paulo, YYYY-MM-DD */
export const diaLocal = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(ts))

const utc = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const iso = (d: Date) => d.toISOString().slice(0, 10)

export const somarDias = (data: string, n: number) => {
  const d = utc(data)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** Diferença em dias: positivo quando `b` é depois de `a` */
export const diasEntre = (a: string, b: string) =>
  Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000)

/** 14/11/2026 */
export const dataBR = (data: string | null | undefined) =>
  data ? data.slice(0, 10).split('-').reverse().join('/') : ''

/** 14/11 */
export const dataCurta = (data: string | null | undefined) =>
  data ? data.slice(5, 10).split('-').reverse().join('/') : ''

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const diaSemana = (data: string) => SEMANA[utc(data).getUTCDay()]

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "novembro de 2026" para YYYY-MM */
export const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} de ${a}`
}

/** "Novembro de 2026" (título) */
export const tituloMes = (mes: string) => {
  const n = nomeMes(mes)
  return n.charAt(0).toUpperCase() + n.slice(1)
}

export const primeiroDiaMes = (mes: string) => `${mes}-01`
export const ultimoDiaMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return iso(new Date(Date.UTC(a, m, 0)))
}
export const somarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number)
  return iso(new Date(Date.UTC(a, m - 1 + n, 1))).slice(0, 7)
}

/** Segunda-feira da semana da data */
export const inicioSemana = (data: string) => {
  const d = utc(data)
  const dia = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dia)
  return iso(d)
}

/** "Hoje", "Amanhã", "em 5 dias", "há 2 dias" */
export function prazoRelativo(data: string) {
  const n = diasEntre(hojeISO(), data)
  if (n === 0) return 'Hoje'
  if (n === 1) return 'Amanhã'
  if (n === -1) return 'Ontem'
  return n > 0 ? `em ${n} dias` : `${-n} dias atrás`
}

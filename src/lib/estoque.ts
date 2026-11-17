import type { Insumo, TipoInsumo, UnidadeInsumo } from './types'
import { lerValor } from '@/components/ui/campo'

/**
 * Número digitado no estoque: "2,4", "1.200", "6". Diferente do campo de
 * valor, letra ou campo vazio dá NaN: "4x" ou "abc" não podem virar zero numa contagem.
 */
export function lerNumero(v: string): number {
  const t = String(v ?? '').replace(/\s/g, '')
  if (!/^-?[\d.,]*\d[\d.,]*$/.test(t)) return NaN
  return lerValor(t)
}

/** Tipos de insumo, na ordem dos filtros */
export const TIPOS_INSUMO: { id: TipoInsumo; nome: string; plural: string }[] = [
  { id: 'tubo', nome: 'Tubo', plural: 'Tubos' },
  { id: 'barra', nome: 'Barra (maciça ou chata)', plural: 'Barras' },
  { id: 'perfil', nome: 'Perfil / cantoneira', plural: 'Perfis' },
  { id: 'chapa', nome: 'Chapa', plural: 'Chapas' },
  { id: 'peca', nome: 'Peça / acessório', plural: 'Peças' },
  { id: 'outro', nome: 'Outro', plural: 'Outros' },
]
export const nomeTipo = (t: TipoInsumo) => TIPOS_INSUMO.find((x) => x.id === t)?.nome ?? t

/**
 * Unidade do saldo e da receita. A fórmula da lista técnica trabalha com as
 * medidas em mm, então para insumo em metros ela dá mm (divide por 1000).
 */
export const UNIDADES: Record<UnidadeInsumo, { nome: string; curto: string; receita: string; fator: number }> = {
  m: { nome: 'Metro linear (m)', curto: 'm', receita: 'mm', fator: 1000 },
  m2: { nome: 'Metro quadrado (m²)', curto: 'm²', receita: 'mm²', fator: 1_000_000 },
  kg: { nome: 'Quilo (kg)', curto: 'kg', receita: 'kg', fator: 1 },
  un: { nome: 'Unidade (un)', curto: 'un', receita: 'un', fator: 1 },
}

/** Insumo comprado em barra ou chapa: [singular, plural] */
export function pecaCompra(i: Pick<Insumo, 'tipo' | 'unidade' | 'por_compra'>): [string, string] | null {
  if (!i.por_compra || i.unidade === 'un' || i.unidade === 'kg') return null
  return i.tipo === 'chapa' ? ['chapa', 'chapas'] : ['barra', 'barras']
}

/** Número em português, sem zeros sobrando: 18,4 · 6 · 0,125 */
export function numero(v: number, casas = 2) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
}

/** 18,4 m · 12 un · 2,5 m² */
export function qtd(v: number, unidade: UnidadeInsumo) {
  return `${numero(v, unidade === 'un' ? 3 : 2)} ${UNIDADES[unidade].curto}`
}

/** Com sinal, para as movimentações: +12 m · −1,2 m */
export function qtdSinal(v: number, unidade: UnidadeInsumo) {
  if (v === 0) return qtd(0, unidade)
  return `${v > 0 ? '+' : '−'}${qtd(Math.abs(v), unidade)}`
}

/** "≈ 3,1 barras de 6 m" (ou null quando não é comprado em barra) */
export function emBarras(saldo: number, i: Pick<Insumo, 'tipo' | 'unidade' | 'por_compra'>) {
  const p = pecaCompra(i)
  if (!p || !i.por_compra || saldo === 0) return null
  const n = saldo / i.por_compra
  return `≈ ${numero(n, 1)} ${Math.abs(n) >= 0.95 && Math.abs(n) < 1.05 ? p[0] : p[1]} de ${qtd(i.por_compra, i.unidade)}`
}

/** "barra de 6 m" */
export function rotuloCompra(i: Pick<Insumo, 'tipo' | 'unidade' | 'por_compra'>) {
  const p = pecaCompra(i)
  return p && i.por_compra ? `${p[0]} de ${qtd(i.por_compra, i.unidade)}` : null
}

export type SituacaoInsumo = 'negativo' | 'sem_estoque' | 'repor' | 'ok' | 'sem_minimo'

/**
 * Alerta de estoque mínimo: o insumo pede reposição quando o saldo chega no
 * mínimo (ou abaixo). Insumo sem mínimo só alerta se o saldo ficar negativo.
 */
export function situacao(i: Pick<Insumo, 'saldo' | 'minimo' | 'ativo'>): SituacaoInsumo {
  if (i.saldo < 0) return 'negativo'
  if (i.minimo > 0 && i.saldo <= 0) return 'sem_estoque'
  if (i.minimo > 0 && i.saldo <= i.minimo) return 'repor'
  return i.minimo > 0 ? 'ok' : 'sem_minimo'
}

export const emAlerta = (i: Insumo) => i.ativo && ['negativo', 'sem_estoque', 'repor'].includes(situacao(i))

export const SITUACOES: Record<SituacaoInsumo, { nome: string; tom: 'warn' | 'palha' | 'ok' | 'aco' } | null> = {
  negativo: { nome: 'Saldo negativo', tom: 'warn' },
  sem_estoque: { nome: 'Sem estoque', tom: 'warn' },
  repor: { nome: 'Repor', tom: 'palha' },
  ok: null,
  sem_minimo: null,
}

/** Valor parado no estoque (saldo negativo não conta) */
export const valorEstoque = (lista: Insumo[]) =>
  lista.filter((i) => i.ativo).reduce((s, i) => s + Math.max(0, i.saldo) * i.custo, 0)

/** Texto sem acento e minúsculo, para a busca */
export const paraBusca = (s: string | null | undefined) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ordenarInsumos(lista: Insumo[]) {
  const ordemTipo = (t: TipoInsumo) => TIPOS_INSUMO.findIndex((x) => x.id === t)
  return [...lista].sort(
    (a, b) => Number(b.ativo) - Number(a.ativo) || ordemTipo(a.tipo) - ordemTipo(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }),
  )
}

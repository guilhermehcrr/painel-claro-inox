import { supabase } from './supabase'
import type { DetalheOrcamento, ItemEntrada, Orcamento, PecaOrcamento, ResumoOrcamento } from './types'
import { mensagemErro } from '@/hooks/useAoVivo'

/**
 * Editor e calculadora de orçamento.
 *
 * O preço NÃO é calculado aqui: o painel manda as medidas e as peças para o
 * banco (calcular_orcamento), que chama o gerar_orcamento do n8n em modo
 * simulação. É a mesma conta da IA, com a mesma tabela de preços.
 * Aqui só ficam o formulário, a troca de preço à mão e os totais na tela.
 */

/** Peças que dá para pôr no orçamento, com os códigos do gerar_orcamento */
export const CATALOGO: { tipo: string; nome: string; grupo: string }[] = [
  { tipo: 'grelha_uruguaia_meia', nome: 'Meia grelha uruguaia', grupo: 'Grelhas' },
  { tipo: 'grelha_uruguaia_inteira', nome: 'Grelha uruguaia', grupo: 'Grelhas' },
  { tipo: 'grelha_argentina_meia', nome: 'Meia grelha argentina', grupo: 'Grelhas' },
  { tipo: 'grelha_argentina_inteira', nome: 'Grelha argentina', grupo: 'Grelhas' },
  { tipo: 'grelha_barra_chata_meia', nome: 'Meia grelha de barra chata', grupo: 'Grelhas' },
  { tipo: 'grelha_barra_chata_inteira', nome: 'Grelha de barra chata', grupo: 'Grelhas' },
  { tipo: 'grelha_descanso_meia', nome: 'Meia grelha de descanso', grupo: 'Grelhas' },
  { tipo: 'grelha_descanso_inteira', nome: 'Grelha de descanso', grupo: 'Grelhas' },
  { tipo: 'grelha_coracao', nome: 'Grelha para miúdo e coração', grupo: 'Grelhas' },
  { tipo: 'grelha_chapa', nome: 'Grelha chapa', grupo: 'Grelhas' },
  { tipo: 'espeto_duplo', nome: 'Espeto duplo', grupo: 'Espetos e giratório' },
  { tipo: 'espeto_espada', nome: 'Espeto espada', grupo: 'Espetos e giratório' },
  { tipo: 'base_giratorio', nome: 'Base de espeto giratório', grupo: 'Espetos e giratório' },
  { tipo: 'giratorio_pilha', nome: 'Espeto giratório a pilha', grupo: 'Espetos e giratório' },
  { tipo: 'giratorio_fio', nome: 'Espeto giratório a tomada', grupo: 'Espetos e giratório' },
]
export const nomePeca = (tipo: string) => CATALOGO.find((c) => c.tipo === tipo)?.nome ?? tipo

export const KIT_BASICO: ItemEntrada[] = [
  { tipo: 'grelha_uruguaia_meia', qtd: 2 },
  { tipo: 'grelha_descanso_inteira', qtd: 1 },
]

export const PERFIS = [
  { id: '2020', nome: '20x20' },
  { id: '2030', nome: '20x30' },
  { id: '2040', nome: '20x40' },
  { id: 'cant1', nome: 'Cantoneira' },
]

/** Tudo o que o Ramon digita. Números ficam como texto para o campo aceitar vírgula. */
export interface Formulario {
  nome: string
  telefone: string
  cep: string
  x_cm: string
  y_cm: string
  altura_cm: string
  niveis: string
  modelo: 'apoio' | 'fixo'
  perfil: string
  quantidade: string
  itens: ItemEntrada[]
  /** Caixa do frete: vazio = o sistema calcula */
  caixa: { comprimento_cm: string; largura_cm: string; altura_cm: string; peso_kg: string }
  /** Transportadora escolhida (nome como volta do Melhor Envio); vazio = automático */
  frete_servico: string
}

export interface Resultado {
  resumo: ResumoOrcamento
  detalhe: DetalheOrcamento
}

const num = (v: string) => {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}
const texto = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '' : String(n).replace('.', ','))

export function formularioVazio(): Formulario {
  return {
    nome: '', telefone: '', cep: '',
    x_cm: '', y_cm: '', altura_cm: '35', niveis: '3', modelo: 'apoio', perfil: '2030', quantidade: '1',
    itens: KIT_BASICO.map((i) => ({ ...i })),
    caixa: { comprimento_cm: '', largura_cm: '', altura_cm: '', peso_kg: '' },
    frete_servico: '',
  }
}

/** Formulário a partir de um orçamento salvo (da IA ou do painel) */
export function formularioDe(o: Orcamento): Formulario {
  const f = formularioVazio()
  const e = o.detalhe?.entrada
  const emb = o.detalhe?.embalagem
  const cot = o.detalhe?.cotacao_frete
  f.nome = o.nome_cliente ?? ''
  f.telefone = o.telefone ?? ''
  f.cep = o.cep ?? ''
  if (e) {
    f.x_cm = texto(e.X / 10)
    f.y_cm = texto(e.Y / 10)
    f.altura_cm = texto((e.altura ?? 350) / 10)
    f.niveis = String(e.niveis ?? 3)
    f.modelo = e.modelo === 'fixo' ? 'fixo' : 'apoio'
    f.perfil = e.perfil || '2030'
    f.quantidade = String(e.quantidade ?? 1)
    f.itens = Array.isArray(e.itens) ? e.itens.map((i) => ({ tipo: i.tipo, qtd: Number(i.qtd) || 1 })) : []
  }
  if (emb?.editada) {
    f.caixa = {
      comprimento_cm: texto(emb.comprimento_cm), largura_cm: texto(emb.largura_cm),
      altura_cm: texto(emb.altura_cm), peso_kg: texto(emb.peso_kg),
    }
  }
  if (cot?.escolha === 'manual' && cot.transportadora) f.frete_servico = cot.transportadora
  return f
}

/** Erros do formulário antes de mandar calcular */
export function conferir(f: Formulario, novo: boolean): string[] {
  const erros: string[] = []
  const faixa = (v: string, nome: string, min: number, max: number, unidade = '') => {
    const n = v.trim() ? num(v) : NaN
    if (!Number.isFinite(n)) erros.push(`${nome}: preencha.`)
    else if (n < min || n > max) erros.push(`${nome}: entre ${min} e ${max}${unidade}.`)
  }
  if (novo && !f.nome.trim()) erros.push('Nome do cliente: preencha.')
  if (f.cep.replace(/\D/g, '').length !== 8) erros.push('CEP: precisa de 8 dígitos.')
  const tel = f.telefone.replace(/\D/g, '')
  if (novo && tel && ![10, 11, 12, 13].includes(tel.length)) erros.push('Telefone: com DDD, ou deixe em branco.')
  faixa(f.x_cm, 'Largura (X)', 20, 120, ' cm')
  faixa(f.y_cm, 'Profundidade (Y)', 20, 120, ' cm')
  faixa(f.altura_cm, 'Altura', 15, 80, ' cm')
  faixa(f.niveis, 'Níveis', 1, 8)
  faixa(f.quantidade, 'Quantidade de suportes', 1, 20)
  const c = f.caixa
  for (const [v, nome, min, max, un] of [
    [c.comprimento_cm, 'Comprimento da caixa', 1, 300, ' cm'], [c.largura_cm, 'Largura da caixa', 1, 300, ' cm'],
    [c.altura_cm, 'Altura da caixa', 1, 300, ' cm'], [c.peso_kg, 'Peso da caixa', 0.1, 100, ' kg'],
  ] as const) {
    if (v.trim()) faixa(v, nome, min, max, un)
  }
  return erros
}

/** O que vai para calcular_orcamento (medidas em mm, como o motor usa) */
export function entradaDe(f: Formulario) {
  const caixa = (v: string) => (v.trim() ? num(v) : null)
  // "sem_kit" na frente: a lista é exatamente a da tela, o motor não põe o kit sozinho
  const itens = ['sem_kit', ...f.itens.filter((i) => i.qtd > 0).map((i) => `${i.tipo}:${i.qtd}`)].join(', ')
  return {
    x_mm: Math.round(num(f.x_cm) * 10),
    y_mm: Math.round(num(f.y_cm) * 10),
    altura_mm: Math.round(num(f.altura_cm) * 10),
    niveis: Math.round(num(f.niveis)),
    modelo: f.modelo,
    perfil_base: f.perfil,
    quantidade: Math.round(num(f.quantidade)),
    cep: f.cep.replace(/\D/g, ''),
    itens,
    frete_comprimento_cm: caixa(f.caixa.comprimento_cm),
    frete_largura_cm: caixa(f.caixa.largura_cm),
    frete_altura_cm: caixa(f.caixa.altura_cm),
    frete_peso_kg: caixa(f.caixa.peso_kg),
    frete_servico: f.frete_servico || null,
  }
}

/** Pede o cálculo ao n8n (pelo banco). Devolve o resultado ou a lista de erros. */
export async function calcular(f: Formulario): Promise<{ ok: true; r: Resultado } | { ok: false; erros: string[] }> {
  const { data, error } = await supabase.rpc('calcular_orcamento', { p_entrada: entradaDe(f) })
  if (error) return { ok: false, erros: [mensagemErro(error.message)] }
  const j = data as { ok?: boolean; erros?: string[]; resumo?: ResumoOrcamento; detalhe?: DetalheOrcamento } | null
  if (!j?.ok || !j.resumo || !j.detalhe) {
    return { ok: false, erros: j?.erros?.length ? j.erros : ['O cálculo não voltou. Tente de novo.'] }
  }
  return { ok: true, r: { resumo: j.resumo, detalhe: j.detalhe } }
}

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/**
 * Aplica os preços digitados à mão (por tipo de peça) em cima do que o
 * sistema calculou. O preço calculado fica guardado em preco_calculado.
 */
export function comPrecosManuais(r: Resultado, manuais: Record<string, number>): Resultado {
  const pecas: PecaOrcamento[] = (r.detalhe.pecas ?? []).map((p) => {
    const calculado = p.preco_calculado ?? p.preco_unitario_exibido ?? 0
    const manual = manuais[p.tipo]
    const unit = manual != null && Number.isFinite(manual) ? r2(manual) : calculado
    const ehManual = manual != null && Number.isFinite(manual) && r2(manual) !== r2(calculado)
    const { preco_manual: _m, preco_calculado: _c, ...resto } = p
    return {
      ...resto,
      preco_unitario_exibido: unit,
      preco_exibido: r2(unit * p.quantidade),
      ...(ehManual ? { preco_manual: true, preco_calculado: calculado } : {}),
    }
  })
  const total = r2(pecas.reduce((s, p) => s + (p.preco_exibido ?? 0), 0))
  return {
    resumo: { ...r.resumo, total, parcela_6x: r2(total / 6), a_vista_pix: r2(total * 0.92) },
    detalhe: { ...r.detalhe, pecas, total },
  }
}

/** Preços manuais que já estavam salvos no orçamento */
export function manuaisDe(d: DetalheOrcamento | null | undefined): Record<string, number> {
  const m: Record<string, number> = {}
  for (const p of d?.pecas ?? []) if (p.preco_manual && p.preco_unitario_exibido != null) m[p.tipo] = p.preco_unitario_exibido
  return m
}

/** Resultado salvo, com o preço calculado de volta no lugar (para reaplicar os manuais) */
export function resultadoDe(o: Orcamento): Resultado | null {
  if (!o.resumo || !o.detalhe?.pecas?.length) return null
  const pecas = o.detalhe.pecas.map((p) =>
    p.preco_manual && p.preco_calculado != null ? { ...p, preco_unitario_exibido: p.preco_calculado } : p,
  )
  return { resumo: o.resumo, detalhe: { ...o.detalhe, pecas } }
}

export async function salvarEdicao(o: Orcamento, f: Formulario, r: Resultado) {
  const { error } = await supabase.rpc('salvar_orcamento_editado', {
    p_id: o.id,
    p_nome: f.nome.trim() || null,
    p_cep: f.cep.replace(/\D/g, ''),
    p_resumo: r.resumo,
    p_detalhe: r.detalhe,
  })
  if (error) throw new Error(mensagemErro(error.message))
}

export async function criarOrcamento(f: Formulario, r: Resultado): Promise<number> {
  const { data, error } = await supabase.rpc('criar_orcamento_painel', {
    p_telefone: f.telefone.replace(/\D/g, '') || null,
    p_nome: f.nome.trim(),
    p_cep: f.cep.replace(/\D/g, ''),
    p_resumo: r.resumo,
    p_detalhe: r.detalhe,
  })
  if (error) throw new Error(mensagemErro(error.message))
  return Number(data)
}

export async function buscarOrcamento(id: number): Promise<Orcamento> {
  const { data, error } = await supabase.from('orcamentos').select('*').eq('id', id).single()
  if (error) throw new Error(mensagemErro(error.message))
  return data as Orcamento
}

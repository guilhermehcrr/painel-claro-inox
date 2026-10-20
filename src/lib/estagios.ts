import type { Estagio } from './types'

/**
 * Os estágios da produção, na ordem. As cores seguem a têmpera da solda no
 * inox (palha, roxo, azul) até o verde do entregue.
 */
export interface InfoEstagio {
  id: Estagio
  nome: string
  /** Classes do selo: fundo + texto */
  selo: string
  /** Cor sólida (barra de progresso, bolinha do calendário) */
  cor: string
  /** Texto do botão que leva PARA este estágio */
  acao: string
}

export const ESTAGIOS: InfoEstagio[] = [
  { id: 'aguardando',  nome: 'Aguardando',  selo: 'bg-aco-tint text-aco',         cor: 'bg-aco',     acao: 'Voltar para aguardando' },
  { id: 'em_producao', nome: 'Em produção', selo: 'bg-palha-tint text-palha',     cor: 'bg-palha',   acao: 'Iniciar produção' },
  { id: 'pronto',      nome: 'Pronto',      selo: 'bg-tempera-tint text-tempera', cor: 'bg-tempera', acao: 'Marcar como pronto' },
  { id: 'expedido',    nome: 'Expedido',    selo: 'bg-indigo-tint text-indigo',   cor: 'bg-indigo',  acao: 'Marcar como enviado' },
  { id: 'entregue',    nome: 'Entregue',    selo: 'bg-ok-tint text-ok',           cor: 'bg-ok',      acao: 'Marcar como entregue' },
]

export const CANCELADO: InfoEstagio = {
  id: 'cancelado', nome: 'Cancelado', selo: 'bg-paper text-faint line-through', cor: 'bg-faint', acao: 'Cancelar pedido',
}

export const infoEstagio = (e: Estagio) => ESTAGIOS.find((x) => x.id === e) ?? CANCELADO

export const posicao = (e: Estagio) => ESTAGIOS.findIndex((x) => x.id === e)

export const proximo = (e: Estagio): InfoEstagio | null => {
  const i = posicao(e)
  return i >= 0 && i < ESTAGIOS.length - 1 ? ESTAGIOS[i + 1] : null
}

export const anterior = (e: Estagio): InfoEstagio | null => {
  const i = posicao(e)
  return i > 0 ? ESTAGIOS[i - 1] : null
}

/** Pedido que ainda está na oficina (conta para carga e atraso) */
export const ativo = (e: Estagio) => e === 'aguardando' || e === 'em_producao' || e === 'pronto'

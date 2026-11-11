import type { Etapa } from './types'

/**
 * Filas das conversas, na ordem do funil. A conversa muda de fila sozinha
 * quando acontece alguma coisa (orçamento gerado, enviado, cliente respondeu,
 * pagamento lançado) e qualquer pessoa do painel pode mudar na mão.
 */
export interface InfoEtapa {
  id: Etapa
  nome: string
  /** Nome curto, para a lista de conversas */
  curto: string
  /** Classes do selo: fundo + texto */
  selo: string
  /** Bolinha da fila */
  ponto: string
  /** O que faz a conversa cair aqui sozinha */
  quando: string
}

export const ETAPAS: InfoEtapa[] = [
  {
    id: 'novo', nome: 'Primeiro contato', curto: 'Contato',
    selo: 'bg-aco-tint text-aco', ponto: 'bg-aco',
    quando: 'Conversa nova, com a IA atendendo.',
  },
  {
    id: 'pendencia_ramon', nome: 'Pendência com Ramon', curto: 'Pendência',
    selo: 'bg-warn-tint text-warn', ponto: 'bg-warn',
    quando: 'A IA passou a conversa para o Ramon ou o orçamento foi rejeitado.',
  },
  {
    id: 'enviar_orcamento', nome: 'Enviar orçamento', curto: 'Enviar orç.',
    selo: 'bg-palha-tint text-palha', ponto: 'bg-palha',
    quando: 'A IA gerou o orçamento e ele espera aprovação.',
  },
  {
    id: 'orcamento_enviado', nome: 'Orçamento enviado', curto: 'Orç. enviado',
    selo: 'bg-indigo-tint text-indigo', ponto: 'bg-indigo',
    quando: 'O PDF da proposta chegou no WhatsApp do cliente.',
  },
  {
    id: 'negociacao', nome: 'Em negociação', curto: 'Negociação',
    selo: 'bg-tempera-tint text-tempera', ponto: 'bg-tempera',
    quando: 'O cliente respondeu depois de receber o orçamento.',
  },
  {
    id: 'pagamento_pendente', nome: 'Pagamento pendente', curto: 'Pag. pendente',
    selo: 'bg-ok-tint text-ok', ponto: 'bg-ok/40',
    quando: 'O pedido existe e ainda tem saldo a receber.',
  },
  {
    id: 'pedido_fechado', nome: 'Pedido fechado', curto: 'Fechado',
    selo: 'bg-ok text-white', ponto: 'bg-ok',
    quando: 'O pedido está pago.',
  },
  {
    id: 'perdido', nome: 'Perdido', curto: 'Perdido',
    selo: 'bg-paper text-faint', ponto: 'bg-faint',
    quando: 'O pedido foi cancelado, ou alguém marcou como perdido.',
  },
]

/** A fila escolhida nas Conversas fica lembrada neste navegador (o Início usa para abrir numa fila) */
export const CHAVE_FILA = 'claro.conversas.fila'

export const infoEtapa = (e: Etapa | null | undefined) => ETAPAS.find((x) => x.id === e) ?? ETAPAS[0]

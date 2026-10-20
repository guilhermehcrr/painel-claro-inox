export type Papel = 'admin' | 'operador'

export interface Perfil {
  id: string
  email: string
  nome: string | null
  papel: Papel
  criado_em: string
}

export type StatusOrcamento = 'aguardando_aprovacao' | 'aprovado' | 'enviado' | 'rejeitado'

export interface ResumoOrcamento {
  total: number
  parcela_6x: number
  a_vista_pix: number
  quantidade: number
  medidas_cm: string
  modelo: 'apoio' | 'fixo'
  niveis: number
  prazo_fabricacao_dias_uteis: number
  prazo_envio: string
  frete_pendente?: boolean
  itens?: string[]
}

export interface ItemMaterial {
  descricao: string
  material: string
  material_nome: string
  mm: number | null
  unidades: number | null
  custo: number
}

export interface CotacaoFrete {
  ok: boolean
  frete?: number
  transportadora?: string | null
  prazo_dias?: number | null
  fallback?: boolean
  motivo_fallback?: string | null
  erro?: string
  opcoes?: { servico: string; preco: number; prazo: number }[]
}

export interface DetalheOrcamento {
  entrada: {
    X: number
    Y: number
    altura: number
    niveis: number
    modelo: string
    perfil: string
    quantidade: number
  }
  pernas_reforco: number
  materiais: ItemMaterial[]
  custo_material_unitario: number
  preco_unitario_sem_diluicao: number
  base: number
  frete: number
  taxa_6x_pct: number
  total: number
  embalagem: {
    comprimento_cm: number
    largura_cm: number
    altura_cm: number
    peso_kg: number | null
  }
  cotacao_frete?: CotacaoFrete | null
  pecas?: PecaOrcamento[]
}

export interface PecaOrcamento {
  tipo: string
  nome: string
  descricao?: string | string[]
  quantidade: number
  preco_unitario?: number
  preco_exibido?: number
}

export interface Orcamento {
  id: number
  orcamento_id: string
  status: StatusOrcamento
  telefone: string | null
  nome_cliente: string | null
  cep: string | null
  frete_pendente: boolean
  resumo: ResumoOrcamento | null
  detalhe: DetalheOrcamento | null
  criado_em: string
  numero_proposta?: string | null
  aprovado_em?: string | null
  enviado_em?: string | null
  decidido_por_nome?: string | null
  pdf_url?: string | null
  a_mm?: number | null
  b_mm?: number | null
  c_mm?: number | null
}

// ---- Conversas (tela estilo WhatsApp Web) ----------------------------------

export type AutorMensagem = 'cliente' | 'ia' | 'ramon' | 'sistema'
export type TipoMensagem =
  | 'texto' | 'audio' | 'imagem' | 'video' | 'documento'
  | 'figurinha' | 'localizacao' | 'contato' | 'outro'

export interface Mensagem {
  id: number
  telefone: string
  direcao: 'entrada' | 'saida'
  autor: AutorMensagem
  tipo: TipoMensagem
  texto: string | null
  arquivo: string | null
  midia_url: string | null
  wa_id: string | null
  importada: boolean
  criado_em: string
}

export interface Conversa {
  telefone: string
  nome: string | null
  status: string
  ia_ligada: boolean
  ultima_texto: string | null
  ultima_tipo: TipoMensagem
  ultima_autor: AutorMensagem
  ultima_em: string
  nao_lidas: number
}

// ---- Produção ----------------------------------------------------------------

export type Estagio = 'aguardando' | 'em_producao' | 'pronto' | 'expedido' | 'entregue' | 'cancelado'

export interface Pedido {
  id: number
  numero: string
  orcamento_id: number | null
  telefone: string | null
  nome_cliente: string | null
  cep: string | null
  estagio: Estagio
  valor: number
  data_entrega: string | null
  codigo_rastreio: string | null
  observacoes: string | null
  resumo: ResumoOrcamento | null
  detalhe: DetalheOrcamento | null
  a_mm: number | null
  b_mm: number | null
  c_mm: number | null
  estagio_em: string
  criado_por_nome: string | null
  criado_em: string
  atualizado_em: string
}

export interface PedidoEvento {
  id: number
  pedido_id: number
  tipo: 'criado' | 'estagio' | 'data_entrega' | 'valor' | 'observacoes'
  de: string | null
  para: string | null
  mensagem_id: number | null
  feito_por_nome: string | null
  criado_em: string
}

// ---- Caixa ---------------------------------------------------------------------

export type TipoLancamento = 'entrada' | 'saida'

export interface Categoria {
  id: number
  nome: string
  tipo: TipoLancamento
  ativa: boolean
}

export interface Lancamento {
  id: number
  tipo: TipoLancamento
  data: string
  valor: number
  categoria_id: number
  descricao: string | null
  pedido_id: number | null
  criado_por_nome: string | null
  criado_em: string
  excluido_em: string | null
  excluido_por_nome: string | null
}

export interface AReceber {
  id: number
  numero: string
  nome_cliente: string | null
  telefone: string | null
  estagio: Estagio
  valor: number
  recebido: number
  saldo: number
  ultimo_pagamento: string | null
  criado_em: string
}

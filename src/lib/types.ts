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
  /** 'manual' = o Ramon escolheu a transportadora no painel */
  escolha?: 'manual'
  /** Transportadora escolhida que não atendeu na última cotação */
  escolha_indisponivel?: string
}

export interface ItemEntrada {
  tipo: string
  qtd: number
}

export interface Embalagem {
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  peso_kg: number | null
  /** O que o sistema calculou (a caixa pode ter sido editada no painel) */
  calculada?: { comprimento_cm: number; largura_cm: number; altura_cm: number; peso_kg: number | null }
  editada?: boolean
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
    itens?: ItemEntrada[]
    kit_padrao?: boolean
  }
  pernas_reforco: number
  materiais: ItemMaterial[]
  custo_material_unitario: number
  preco_unitario_sem_diluicao: number
  base: number
  frete: number
  taxa_6x_pct: number
  total: number
  embalagem: Embalagem
  cotacao_frete?: CotacaoFrete | null
  pecas?: PecaOrcamento[]
}

export interface PecaOrcamento {
  tipo: string
  nome: string
  descricao?: string | string[]
  quantidade: number
  preco_unitario?: number
  /** Preço unitário que o cliente vê no PDF (frete e 6x já diluídos) */
  preco_unitario_exibido?: number
  preco_exibido?: number
  /** Preço digitado pelo Ramon no editor */
  preco_manual?: boolean
  /** O que o sistema tinha calculado antes do preço manual */
  preco_calculado?: number
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
  /** ia = atendimento no WhatsApp; painel = calculadora do painel */
  origem?: 'ia' | 'painel'
  resumo_ia?: ResumoOrcamento | null
  detalhe_ia?: DetalheOrcamento | null
  editado_em?: string | null
  editado_por_nome?: string | null
  criado_por_nome?: string | null
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

/** Fila da conversa no funil (muda sozinha nos eventos e na mão pelo painel) */
export type Etapa =
  | 'novo' | 'pendencia_ramon' | 'enviar_orcamento' | 'orcamento_enviado'
  | 'negociacao' | 'pagamento_pendente' | 'pedido_fechado' | 'perdido'

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
  etapa: Etapa
  etapa_em: string | null
  /** Quem moveu na mão. Vazio = o sistema moveu sozinho */
  etapa_por_nome: string | null
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
  /** Pedido excluído: sai da produção, do calendário e do caixa, e pode voltar */
  excluido_em: string | null
  excluido_por_nome: string | null
}

export type CategoriaAnexo = 'foto' | 'nf' | 'arquivo'

export interface PedidoAnexo {
  id: number
  pedido_id: number
  caminho: string
  nome: string
  categoria: CategoriaAnexo
  tipo: string | null
  tamanho: number | null
  criado_por: string | null
  criado_por_nome: string | null
  criado_em: string
}

export interface PedidoEvento {
  id: number
  pedido_id: number
  tipo:
    | 'criado' | 'estagio' | 'data_entrega' | 'valor' | 'observacoes'
    | 'excluido' | 'restaurado' | 'anexo' | 'anexo_removido'
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

// ---- Estoque e produtos ----------------------------------------------------------

export type TipoInsumo = 'tubo' | 'barra' | 'chapa' | 'perfil' | 'peca' | 'outro'
/** m = metro linear, m2 = metro quadrado */
export type UnidadeInsumo = 'm' | 'm2' | 'kg' | 'un'

export interface Insumo {
  id: number
  /** Código no motor de orçamento (T2030, CH14...) */
  codigo: string | null
  nome: string
  tipo: TipoInsumo
  unidade: UnidadeInsumo
  /** Quanto vem em cada barra ou chapa comprada, na unidade do insumo (6 = barra de 6 m) */
  por_compra: number | null
  /** R$ por unidade (por metro, por un...) */
  custo: number
  saldo: number
  minimo: number
  ativo: boolean
  observacao: string | null
  /** Última vez que alguém contou este insumo */
  contado_em: string | null
  criado_em: string
  atualizado_em: string
}

/** entrada = compra; ajuste = contagem; saida/estorno = baixa pelos pedidos (próximo ciclo) */
export type TipoMovimento = 'entrada' | 'ajuste' | 'saida' | 'estorno'

export interface Movimento {
  id: number
  insumo_id: number
  tipo: TipoMovimento
  /** Com sinal: + entrou, − saiu */
  quantidade: number
  saldo_antes: number
  saldo_depois: number
  custo_unitario: number | null
  fornecedor: string | null
  nota: string | null
  justificativa: string | null
  lote: string | null
  feito_por_nome: string | null
  feito_em: string
  insumos?: Pick<Insumo, 'nome' | 'unidade' | 'por_compra' | 'tipo' | 'codigo'> | null
}

export interface Produto {
  id: number
  nome: string
  categoria: string
  descricao: string | null
  /** Código no motor de orçamento, quando não tem variações */
  codigo: string | null
  ativo: boolean
  ordem: number
  atualizado_em: string
  atualizado_por_nome: string | null
}

export interface Variacao {
  id: number
  produto_id: number
  nome: string
  codigo: string | null
  ordem: number
}

export interface LinhaTecnica {
  id: number
  produto_id: number
  insumo_id: number
  /** Parte da peça: Torres, Quadro, Ripas... */
  descricao: string
  /** Em mm para insumo em metros, mm² para m², kg ou unidades */
  formula: string
  ordem: number
  /** Vazio = vale para todas as variações */
  variacoes: number[]
  atualizado_em: string
  atualizado_por_nome: string | null
}

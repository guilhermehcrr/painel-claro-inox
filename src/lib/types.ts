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
}

import { useEffect, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import type { Conversa, Etapa } from '@/lib/types'
import { useMensagens } from '@/hooks/useMensagens'
import { CHAVE_FILA, ETAPAS } from '@/lib/etapas'
import { cn } from '@/lib/utils'
import { ListaConversas, type Fila } from './ListaConversas'
import { ChatConversa } from './ChatConversa'

function filaGuardada(): Fila {
  try {
    const v = localStorage.getItem(CHAVE_FILA)
    if (v && (v === 'todas' || ETAPAS.some((e) => e.id === v))) return v as Fila
  } catch {
    /* navegador sem armazenamento: começa em todas */
  }
  return 'todas'
}

interface Props {
  conversas: Conversa[]
  carregando: boolean
  erro: string | null
  /** Telefone da conversa aberta (vem do endereço #/conversas/5531...) */
  selecionado: string | null
  onSelecionar: (telefone: string | null) => void
  onDefinirEtapa: (telefone: string, etapa: Etapa) => Promise<void>
}

/**
 * Tela de Conversas. No computador: lista à esquerda e conversa à direita.
 * No celular: uma de cada vez, com botão de voltar.
 */
export function Conversas({ conversas, carregando, erro, selecionado, onSelecionar, onDefinirEtapa }: Props) {
  const [busca, setBusca] = useState('')
  const [fila, setFila] = useState<Fila>(filaGuardada)
  function trocarFila(f: Fila) {
    setFila(f)
    try {
      localStorage.setItem(CHAVE_FILA, f)
    } catch {
      /* sem armazenamento: só não lembra */
    }
  }
  const { mensagens, carregando: carregandoMsg, erro: erroMsg, responder, definirIA, marcarLida } =
    useMensagens(selecionado)

  const atual = conversas.find((c) => c.telefone === selecionado)

  // Conversa aberta conta como lida, inclusive quando chega mensagem nova nela
  const ultimaEntrada = useRef<number | null>(null)
  useEffect(() => {
    if (!selecionado || carregandoMsg) return
    const ultima = [...mensagens].reverse().find((m) => m.direcao === 'entrada')
    const id = ultima?.id ?? -1
    if (ultimaEntrada.current !== id || (atual?.nao_lidas ?? 0) > 0) {
      ultimaEntrada.current = id
      if (document.visibilityState === 'visible') marcarLida()
    }
  }, [selecionado, mensagens, carregandoMsg, atual?.nao_lidas, marcarLida])

  return (
    <div className="flex h-full min-h-0 bg-card">
      <aside
        className={cn(
          'h-full min-h-0 w-full border-r border-hair md:w-[340px] md:shrink-0 lg:w-[380px]',
          selecionado ? 'hidden md:block' : 'block',
        )}
      >
        {erro ? (
          <p className="p-6 text-sm text-warn">Não consegui carregar as conversas: {erro}</p>
        ) : (
          <ListaConversas
            conversas={conversas}
            selecionado={selecionado}
            busca={busca}
            onBusca={setBusca}
            fila={fila}
            onFila={trocarFila}
            onSelecionar={onSelecionar}
            carregando={carregando}
          />
        )}
      </aside>

      <section className={cn('h-full min-h-0 flex-1', selecionado ? 'block' : 'hidden md:block')}>
        {selecionado ? (
          <ChatConversa
            conversa={atual}
            telefone={selecionado}
            mensagens={mensagens}
            carregando={carregandoMsg}
            erro={erroMsg}
            onVoltar={() => onSelecionar(null)}
            onResponder={responder}
            onDefinirIA={definirIA}
            onDefinirEtapa={(etapa) => onDefinirEtapa(selecionado, etapa)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-paper p-8 text-center">
            <MessagesSquare className="h-8 w-8 text-faint" strokeWidth={1.5} />
            <p className="font-medium text-ink">Escolha uma conversa</p>
            <p className="max-w-xs text-sm text-faint">
              Aqui você acompanha o que a IA está respondendo, responde você mesmo e liga ou desliga a IA em cada cliente.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

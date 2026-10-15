import { useEffect, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import type { Conversa } from '@/lib/types'
import { useMensagens } from '@/hooks/useMensagens'
import { cn } from '@/lib/utils'
import { ListaConversas } from './ListaConversas'
import { ChatConversa } from './ChatConversa'

interface Props {
  conversas: Conversa[]
  carregando: boolean
  erro: string | null
}

/**
 * Tela de Conversas. No computador: lista à esquerda e conversa à direita.
 * No celular: uma de cada vez, com botão de voltar.
 */
export function Conversas({ conversas, carregando, erro }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
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
    <div className="mx-auto flex h-full min-h-0 max-w-6xl border-x border-hair bg-card">
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
            onSelecionar={setSelecionado}
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
            onVoltar={() => setSelecionado(null)}
            onResponder={responder}
            onDefinirIA={definirIA}
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

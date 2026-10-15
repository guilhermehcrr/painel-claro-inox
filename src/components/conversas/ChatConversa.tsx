import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, Bot, ExternalLink, Info, SendHorizontal } from 'lucide-react'
import type { Conversa, Mensagem } from '@/lib/types'
import { mesmoDia, rotuloDia, telefoneBonito } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BolhaMensagem } from './BolhaMensagem'

function ChaveIA({
  ligada,
  ocupado,
  onTrocar,
}: {
  ligada: boolean
  ocupado: boolean
  onTrocar: () => void
}) {
  return (
    <button
      role="switch"
      aria-checked={ligada}
      onClick={onTrocar}
      disabled={ocupado}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60',
        ligada ? 'border-ok/30 bg-ok-tint text-ok' : 'border-warn/30 bg-warn-tint text-warn',
      )}
    >
      <Bot className="h-4 w-4" strokeWidth={1.75} />
      <span className="sm:hidden">IA</span>
      <span className="hidden sm:inline">{ligada ? 'IA respondendo' : 'IA pausada'}</span>
      <span
        className={cn(
          'relative h-4 w-7 rounded-full transition-colors',
          ligada ? 'bg-ok' : 'bg-faint',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
            ligada ? 'left-3.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

function Caixa({
  iaLigada,
  onEnviar,
}: {
  iaLigada: boolean
  onEnviar: (texto: string) => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Cresce até ~5 linhas
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }, [texto])

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      await onEnviar(t)
      setTexto('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi. Tente de novo.')
    } finally {
      setEnviando(false)
      ref.current?.focus()
    }
  }

  return (
    <div className="border-t border-hair bg-card px-3 pb-3 pt-2">
      {erro && <div className="mb-2 bg-warn-tint px-3 py-1.5 text-[12px] text-warn">{erro}</div>}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Escreva uma mensagem"
          className="max-h-[132px] min-h-[42px] flex-1 resize-none rounded-lg border border-hair bg-paper px-3 py-2.5 text-[14px] leading-snug text-ink outline-none placeholder:text-faint focus:border-indigo"
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          aria-label="Enviar"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-ok text-white transition-colors hover:bg-ok/90 disabled:opacity-40"
        >
          <SendHorizontal className={cn('h-5 w-5', enviando && 'animate-pulse')} strokeWidth={1.75} />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-faint">
        {iaLigada
          ? 'Ao enviar, a IA pausa nesta conversa. Enter envia · Shift+Enter quebra linha'
          : 'Enter envia · Shift+Enter quebra linha'}
      </p>
    </div>
  )
}

interface Props {
  conversa: Conversa | undefined
  telefone: string
  mensagens: Mensagem[]
  carregando: boolean
  erro: string | null
  onVoltar: () => void
  onResponder: (texto: string) => Promise<void>
  onDefinirIA: (ligada: boolean) => Promise<void>
}

export function ChatConversa({
  conversa,
  telefone,
  mensagens,
  carregando,
  erro,
  onVoltar,
  onResponder,
  onDefinirIA,
}: Props) {
  const rolagem = useRef<HTMLDivElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const noFim = useRef(true)
  const [trocandoIA, setTrocandoIA] = useState(false)
  const [erroIA, setErroIA] = useState<string | null>(null)
  const iaLigada = conversa?.ia_ligada ?? true

  // Abre no fim; desce sozinho quando chega mensagem, se já estava no fim
  useEffect(() => {
    noFim.current = true
  }, [telefone])
  useLayoutEffect(() => {
    const el = rolagem.current
    if (el && noFim.current) el.scrollTop = el.scrollHeight
  }, [mensagens])
  // Foto que termina de carregar depois aumenta a conversa: continua no fim
  useEffect(() => {
    const el = rolagem.current
    const dentro = conteudo.current
    if (!el || !dentro || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(() => {
      if (noFim.current) el.scrollTop = el.scrollHeight
    })
    obs.observe(dentro)
    return () => obs.disconnect()
  }, [telefone])

  async function trocarIA() {
    setTrocandoIA(true)
    setErroIA(null)
    try {
      await onDefinirIA(!iaLigada)
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : 'Não consegui mudar a IA.')
    } finally {
      setTrocandoIA(false)
    }
  }

  const temImportada = mensagens.some((m) => m.importada)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-hair bg-card px-2 py-2 sm:px-3">
        <button
          onClick={onVoltar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper md:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1 pl-1">
          <div className="truncate text-[15px] font-semibold text-ink">
            {conversa?.nome || telefoneBonito(telefone)}
          </div>
          <a
            href={`https://wa.me/${telefone}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-faint hover:text-indigo"
          >
            {telefoneBonito(telefone)}
            <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
          </a>
        </div>
        <ChaveIA ligada={iaLigada} ocupado={trocandoIA} onTrocar={trocarIA} />
      </header>

      {erroIA && <div className="bg-warn-tint px-4 py-1.5 text-[12px] text-warn">{erroIA}</div>}
      {!iaLigada && (
        <div className="border-b border-hair bg-warn-tint/60 px-4 py-1.5 text-[12px] text-warn">
          A IA não responde este cliente enquanto estiver pausada. Religue no botão acima.
        </div>
      )}

      <div
        ref={rolagem}
        onScroll={(e) => {
          const el = e.currentTarget
          noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-paper px-3 py-3 sm:px-6"
      >
        <div ref={conteudo} className="space-y-1.5">
        {carregando && <p className="py-10 text-center text-sm text-faint">Carregando…</p>}
        {erro && <p className="py-10 text-center text-sm text-warn">Não consegui carregar: {erro}</p>}
        {!carregando && !erro && !mensagens.length && (
          <p className="py-10 text-center text-sm text-faint">Nenhuma mensagem nesta conversa.</p>
        )}
        {temImportada && (
          <div className="mx-auto mb-2 flex max-w-md items-start gap-2 rounded-lg bg-card px-3 py-2 text-[12px] text-muted">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            As mensagens antigas vieram da memória da IA. O que o Ramon mandou antes desta tela não aparece.
          </div>
        )}
        {mensagens.map((m, i) => {
          const anterior = mensagens[i - 1]
          const novoDia = !anterior || !mesmoDia(anterior.criado_em, m.criado_em)
          return (
            <div key={m.id}>
              {novoDia && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-card px-2.5 py-1 text-[11px] font-medium text-muted shadow-[0_1px_0_rgba(11,13,20,.06)]">
                    {rotuloDia(m.criado_em)}
                  </span>
                </div>
              )}
              <BolhaMensagem m={m} />
            </div>
          )
        })}
        </div>
      </div>

      <Caixa iaLigada={iaLigada} onEnviar={onResponder} />
    </div>
  )
}

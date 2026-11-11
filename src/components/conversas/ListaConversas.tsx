import { Bot, FileText, Image, MapPin, Mic, Search, Sticker, User, Video } from 'lucide-react'
import type { Conversa, Etapa, TipoMensagem } from '@/lib/types'
import { quandoNaLista, telefoneBonito } from '@/lib/format'
import { ETAPAS, infoEtapa } from '@/lib/etapas'
import { cn } from '@/lib/utils'

export type Fila = 'todas' | Etapa

const ROTULO_TIPO: Partial<Record<TipoMensagem, [string, typeof Mic]>> = {
  audio: ['Áudio', Mic],
  imagem: ['Foto', Image],
  video: ['Vídeo', Video],
  documento: ['Documento', FileText],
  figurinha: ['Figurinha', Sticker],
  localizacao: ['Localização', MapPin],
  contato: ['Contato', User],
}

function Previa({ c }: { c: Conversa }) {
  const prefixo =
    c.ultima_autor === 'ia' ? 'IA: ' : c.ultima_autor === 'ramon' ? 'Ramon: ' : c.ultima_autor === 'sistema' ? 'Aviso: ' : ''
  const tipo = ROTULO_TIPO[c.ultima_tipo]
  if (tipo) {
    const [rotulo, Icone] = tipo
    return (
      <span className="flex min-w-0 items-center gap-1">
        {prefixo}
        <Icone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{c.ultima_texto || rotulo}</span>
      </span>
    )
  }
  return <span className="truncate">{prefixo}{c.ultima_texto || '—'}</span>
}

/** Filas do funil, com a quantidade de conversas em cada uma */
function Filas({ conversas, fila, onFila }: { conversas: Conversa[]; fila: Fila; onFila: (f: Fila) => void }) {
  const qtd = (e: Etapa) => conversas.filter((c) => c.etapa === e).length
  const chip = (ativo: boolean) =>
    cn(
      'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] transition-colors',
      ativo ? 'border-ink bg-ink text-white' : 'border-hair bg-card text-body hover:border-faint',
    )
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5" role="tablist" aria-label="Filas">
      <button role="tab" aria-selected={fila === 'todas'} onClick={() => onFila('todas')} className={chip(fila === 'todas')}>
        Todas
        <span className={cn('tnum', fila === 'todas' ? 'text-white/70' : 'text-faint')}>{conversas.length}</span>
      </button>
      {ETAPAS.map((e) => {
        const n = qtd(e.id)
        const ativo = fila === e.id
        return (
          <button
            key={e.id}
            role="tab"
            aria-selected={ativo}
            title={`${e.nome}: ${e.quando}`}
            onClick={() => onFila(e.id)}
            className={cn(chip(ativo), !n && !ativo && 'text-faint')}
          >
            <span className={cn('h-2 w-2 rounded-full', e.ponto)} />
            {e.curto}
            <span className={cn('tnum', ativo ? 'text-white/70' : 'text-faint')}>{n}</span>
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  conversas: Conversa[]
  selecionado: string | null
  busca: string
  onBusca: (v: string) => void
  fila: Fila
  onFila: (f: Fila) => void
  onSelecionar: (telefone: string) => void
  carregando?: boolean
}

export function ListaConversas({ conversas, selecionado, busca, onBusca, fila, onFila, onSelecionar, carregando }: Props) {
  const termo = busca.trim().toLowerCase()
  const digitos = termo.replace(/\D/g, '')
  const daFila = fila === 'todas' ? conversas : conversas.filter((c) => c.etapa === fila)
  const filtradas = termo
    ? daFila.filter(
        (c) =>
          (c.nome ?? '').toLowerCase().includes(termo) ||
          (digitos.length > 0 && c.telefone.includes(digitos)),
      )
    : daFila

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-hair">
        <div className="p-3">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-hair bg-paper px-3 focus-within:border-indigo">
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
          <input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar por nome ou número"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </label>
        </div>
        <Filas conversas={conversas} fila={fila} onFila={onFila} />
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {carregando && <li className="p-6 text-center text-sm text-faint">Carregando…</li>}
        {!carregando && !filtradas.length && (
          <li className="p-6 text-center text-sm text-faint">
            {termo
              ? 'Nenhuma conversa encontrada.'
              : fila !== 'todas'
                ? `Nenhuma conversa em ${infoEtapa(fila).nome.toLowerCase()}.`
                : 'Nenhuma conversa ainda.'}
          </li>
        )}
        {filtradas.map((c) => (
          <li key={c.telefone}>
            <button
              onClick={() => onSelecionar(c.telefone)}
              className={cn(
                'flex w-full gap-3 border-b border-hair px-3 py-3 text-left transition-colors',
                selecionado === c.telefone ? 'bg-indigo-tint' : 'hover:bg-paper',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium',
                  c.ia_ligada ? 'bg-paper text-muted' : 'bg-warn-tint text-warn',
                )}
                aria-hidden
              >
                {(c.nome || '#').trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate text-[14px] text-ink', c.nao_lidas > 0 && 'font-semibold')}>
                    {c.nome || telefoneBonito(c.telefone)}
                  </span>
                  <span
                    className={cn(
                      'tnum shrink-0 text-[11px]',
                      c.nao_lidas > 0 ? 'font-medium text-ok' : 'text-faint',
                    )}
                  >
                    {quandoNaLista(c.ultima_em)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[13px] text-muted">
                  <Previa c={c} />
                  <span className="flex shrink-0 items-center gap-1.5">
                    {fila === 'todas' && (
                      <span
                        className={cn('whitespace-nowrap rounded-lg px-1.5 py-px text-[10px] font-medium', infoEtapa(c.etapa).selo)}
                        title={infoEtapa(c.etapa).nome}
                      >
                        {infoEtapa(c.etapa).curto}
                      </span>
                    )}
                    {!c.ia_ligada && (
                      <span className="flex items-center gap-0.5 rounded-lg bg-warn-tint px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-warn">
                        <Bot className="h-3 w-3" strokeWidth={2} />
                        pausada
                      </span>
                    )}
                    {c.nao_lidas > 0 && (
                      <span className="tnum flex h-5 min-w-5 items-center justify-center rounded-full bg-ok px-1.5 text-[11px] font-medium text-white">
                        {c.nao_lidas}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

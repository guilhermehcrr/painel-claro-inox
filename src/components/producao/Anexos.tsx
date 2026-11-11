import { useRef, useState } from 'react'
import { Camera, FileText, Paperclip, Receipt, Trash2 } from 'lucide-react'
import type { CategoriaAnexo, PedidoAnexo } from '@/lib/types'
import { desde } from '@/lib/format'
import { LIMITE_MB, useAnexos } from '@/hooks/useAnexos'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Button } from '@/components/ui/button'
import { Painel } from '@/components/ui/page'
import { cn } from '@/lib/utils'

const BOTOES: { categoria: CategoriaAnexo; nome: string; icone: typeof Camera; aceita: string }[] = [
  { categoria: 'foto', nome: 'Foto', icone: Camera, aceita: 'image/*' },
  { categoria: 'nf', nome: 'Nota fiscal', icone: Receipt, aceita: '.pdf,.xml,image/*' },
  { categoria: 'arquivo', nome: 'Arquivo', icone: Paperclip, aceita: '' },
]

const ROTULO: Record<CategoriaAnexo, string> = { foto: 'Foto', nf: 'Nota fiscal', arquivo: 'Arquivo' }

function tamanho(b: number | null) {
  if (!b) return ''
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

interface Props {
  pedidoId: number
  ehAdmin: boolean
  meuId: string
  /** Pedido excluído: só consulta */
  somenteLeitura?: boolean
}

/** Arquivos da OS: foto da peça, nota fiscal, desenho, comprovante */
export function Anexos({ pedidoId, ehAdmin, meuId, somenteLeitura }: Props) {
  const { anexos, links, erro: erroLista, anexar, remover, abrir } = useAnexos(pedidoId)
  const entradas = useRef<Record<string, HTMLInputElement | null>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function escolher(categoria: CategoriaAnexo, arquivos: FileList | null) {
    if (!arquivos?.length) return
    setErro(null)
    const lista = Array.from(arquivos)
    try {
      for (const [i, a] of lista.entries()) {
        setEnviando(lista.length > 1 ? `Enviando ${i + 1} de ${lista.length}…` : 'Enviando…')
        await anexar(a, categoria)
      }
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setEnviando(null)
      const el = entradas.current[categoria]
      if (el) el.value = ''
    }
  }

  async function apagar(a: PedidoAnexo) {
    if (!window.confirm(`Apagar "${a.nome}"? O arquivo some de vez.`)) return
    setErro(null)
    try {
      await remover(a)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function ver(a: PedidoAnexo) {
    setErro(null)
    try {
      await abrir(a)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  const podeApagar = (a: PedidoAnexo) => !somenteLeitura && (ehAdmin || a.criado_por === meuId)
  const fotos = anexos.filter((a) => a.categoria === 'foto' && links[a.caminho])
  const outros = anexos.filter((a) => !fotos.includes(a))

  return (
    <Painel
      titulo={
        <span className="flex items-center gap-2">
          Anexos
          {anexos.length > 0 && <span className="tnum text-[13px] font-normal text-faint">{anexos.length}</span>}
        </span>
      }
      corpo="px-4 py-3"
    >
      {!somenteLeitura && (
        <div className="flex flex-wrap items-center gap-2">
          {BOTOES.map((b) => (
            <label key={b.categoria} className={cn(enviando && 'pointer-events-none opacity-50')}>
              <input
                ref={(el) => {
                  entradas.current[b.categoria] = el
                }}
                type="file"
                multiple
                accept={b.aceita || undefined}
                className="sr-only"
                onChange={(e) => escolher(b.categoria, e.target.files)}
              />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hair bg-card px-3 text-[13px] font-medium text-body hover:bg-paper">
                <b.icone className="h-4 w-4 text-muted" strokeWidth={1.75} />
                {b.nome}
              </span>
            </label>
          ))}
          <span className="text-[12px] text-faint">{enviando ?? `até ${LIMITE_MB} MB por arquivo`}</span>
        </div>
      )}

      {(erro || erroLista) && <p className="mt-2 text-[13px] text-warn">{erro || erroLista}</p>}

      {!anexos.length && (
        <p className={cn('text-[14px] text-muted', !somenteLeitura && 'mt-3')}>
          Nenhum anexo. Foto da peça, nota fiscal, desenho ou comprovante ficam aqui.
        </p>
      )}

      {fotos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((a) => (
            <li key={a.id} className="group relative">
              <button
                onClick={() => ver(a)}
                className="block aspect-square w-full overflow-hidden rounded-md border border-hair bg-paper"
                title={`${a.nome}, ${a.criado_por_nome ?? ''} ${desde(a.criado_em)}`}
              >
                <img src={links[a.caminho]} alt={a.nome} loading="lazy" className="h-full w-full object-cover" />
              </button>
              {podeApagar(a) && (
                <button
                  onClick={() => apagar(a)}
                  className="absolute right-1 top-1 rounded bg-card/90 p-1 text-faint shadow-sm hover:text-warn sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Apagar ${a.nome}`}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {outros.length > 0 && (
        <ul className="mt-3 divide-y divide-hair rounded-md border border-hair">
          {outros.map((a) => {
            const Icone = a.categoria === 'nf' ? Receipt : a.categoria === 'foto' ? Camera : FileText
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <Icone className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <button onClick={() => ver(a)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[14px] text-indigo hover:underline">{a.nome}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {ROTULO[a.categoria]}
                    {a.tamanho ? `, ${tamanho(a.tamanho)}` : ''}
                    {a.criado_por_nome ? `, ${a.criado_por_nome}` : ''} {desde(a.criado_em)}
                  </span>
                </button>
                {podeApagar(a) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 hover:bg-warn-tint hover:text-warn"
                    onClick={() => apagar(a)}
                    aria-label={`Apagar ${a.nome}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Painel>
  )
}

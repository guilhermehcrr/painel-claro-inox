import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Produto } from '@/lib/types'
import type { DadosProduto } from '@/hooks/useProdutos'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Rotulo, Texto } from '@/components/ui/campo'

/** Novo produto ou editar nome, categoria e descrição (só admin) */
export function FormProduto({
  produto,
  categorias,
  onFechar,
  onSalvar,
  onExcluir,
}: {
  produto?: Produto | null
  categorias: string[]
  onFechar: () => void
  onSalvar: (d: DadosProduto) => Promise<number>
  onExcluir?: () => Promise<void>
}) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [categoria, setCategoria] = useState(produto?.categoria ?? categorias[0] ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Escreva o nome do produto.')
    setSalvando(true)
    try {
      await onSalvar({ id: produto?.id, nome, categoria, descricao, ativo })
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!onExcluir || !produto) return
    if (!window.confirm(`Apagar "${produto.nome}" com as variações e a lista técnica? Não dá para desfazer.`)) return
    setSalvando(true)
    try {
      await onExcluir()
    } catch (e) {
      setErro(mensagemErro(e))
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      titulo={produto ? 'Editar produto' : 'Novo produto'}
      onFechar={onFechar}
      rodape={
        <>
          {produto && onExcluir && (
            <Button variant="ghost" onClick={excluir} disabled={salvando} className="mr-auto text-warn hover:bg-warn-tint hover:text-warn">
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Apagar
            </Button>
          )}
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : produto ? 'Salvar' : 'Criar produto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Rotulo htmlFor="p-nome">Nome</Rotulo>
          <Entrada id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Grelha argentina" autoFocus={!produto} />
        </div>
        <div>
          <Rotulo htmlFor="p-cat">Categoria</Rotulo>
          <Entrada id="p-cat" list="p-cats" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Grelhas" />
          <datalist id="p-cats">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <Rotulo htmlFor="p-desc" dica="opcional">Descrição</Rotulo>
          <Texto id="p-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="min-h-[60px]" />
        </div>
        {produto && (
          <label className="flex items-start gap-2.5 text-[14px] text-body">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo" />
            <span>
              Produto ativo
              <span className="block text-[12px] text-faint">Desativado fica no fim da lista, marcado. A lista técnica continua guardada.</span>
            </span>
          </label>
        )}
        {!produto && (
          <p className="text-[12px] text-faint">Depois de criar, você monta a lista técnica e, se precisar, as variações (ex.: meia e inteira).</p>
        )}
        {erro && <p className="text-[13px] text-warn">{erro}</p>}
      </div>
    </Modal>
  )
}

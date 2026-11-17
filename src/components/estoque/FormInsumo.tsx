import { useState } from 'react'
import type { Insumo, TipoInsumo, UnidadeInsumo } from '@/lib/types'
import type { DadosInsumo } from '@/hooks/useEstoque'
import { TIPOS_INSUMO, UNIDADES, lerNumero, numero, pecaCompra } from '@/lib/estoque'
import { brl } from '@/lib/format'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha, Rotulo, Texto } from '@/components/ui/campo'

const txt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '' : String(Math.round(n * 10000) / 10000).replace('.', ','))

/** Unidade que costuma acompanhar o tipo (só sugestão no cadastro) */
const UNIDADE_DO_TIPO: Record<TipoInsumo, UnidadeInsumo> = {
  tubo: 'm', barra: 'm', perfil: 'm', chapa: 'un', peca: 'un', outro: 'un',
}

/** Cadastro e edição de insumo (só admin) */
export function FormInsumo({
  aberto,
  insumo,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  insumo?: Insumo | null
  onFechar: () => void
  onSalvar: (d: DadosInsumo) => Promise<number>
}) {
  const novo = !insumo
  const [nome, setNome] = useState(insumo?.nome ?? '')
  const [codigo, setCodigo] = useState(insumo?.codigo ?? '')
  const [tipo, setTipo] = useState<TipoInsumo>(insumo?.tipo ?? 'tubo')
  const [unidade, setUnidade] = useState<UnidadeInsumo>(insumo?.unidade ?? 'm')
  const [porCompra, setPorCompra] = useState(insumo ? txt(insumo.por_compra) : '6')
  // Comprado em barra: o preço digitado é o da barra
  const [preco, setPreco] = useState(
    insumo ? txt(insumo.por_compra && insumo.unidade !== 'un' && insumo.unidade !== 'kg' ? insumo.custo * insumo.por_compra : insumo.custo) : '',
  )
  const [minimo, setMinimo] = useState(insumo ? txt(insumo.minimo) : '')
  const [saldoHoje, setSaldoHoje] = useState('')
  const [obs, setObs] = useState(insumo?.observacao ?? '')
  const [ativo, setAtivo] = useState(insumo?.ativo ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const temCompra = unidade === 'm' || unidade === 'm2'
  const por = temCompra && porCompra.trim() ? lerNumero(porCompra) : null
  const p = pecaCompra({ tipo, unidade, por_compra: por && por > 0 ? por : null })
  const un = UNIDADES[unidade].curto
  const nPreco = preco.trim() ? lerNumero(preco) : 0
  const custo = p && por ? nPreco / por : nPreco
  const nMin = minimo.trim() ? lerNumero(minimo) : 0

  function trocarTipo(t: TipoInsumo) {
    setTipo(t)
    if (novo) {
      setUnidade(UNIDADE_DO_TIPO[t])
      // Barra de 6 m é o comum; chapa varia muito, então começa em branco
      setPorCompra(t === 'tubo' || t === 'barra' || t === 'perfil' ? '6' : '')
    }
  }

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Escreva o nome do insumo.')
    if (por != null && (!Number.isFinite(por) || por <= 0)) return setErro('Tamanho da barra ou chapa: digite um número maior que zero, ou deixe em branco.')
    if (!Number.isFinite(nPreco) || nPreco < 0) return setErro('Preço: número que não entendi.')
    if (!Number.isFinite(nMin) || nMin < 0) return setErro('Estoque mínimo: número que não entendi.')
    const inicial = novo && saldoHoje.trim() ? lerNumero(saldoHoje) : null
    if (inicial != null && (!Number.isFinite(inicial) || inicial < 0)) return setErro('Quanto tem hoje: número que não entendi.')
    setSalvando(true)
    try {
      await onSalvar({
        id: insumo?.id,
        nome: nome.trim(),
        codigo: codigo.trim(),
        tipo,
        unidade,
        por_compra: temCompra && por ? por : null,
        custo: Math.round(custo * 1e6) / 1e6,
        minimo: nMin,
        ativo,
        observacao: obs.trim(),
        saldo_inicial: inicial,
      })
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={novo ? 'Novo insumo' : 'Editar insumo'}
      onFechar={onFechar}
      rodape={
        <>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : novo ? 'Cadastrar' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Rotulo htmlFor="i-nome">Nome</Rotulo>
          <Entrada id="i-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Ex.: Tubo retangular 20x30' autoFocus={novo} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="i-tipo">Tipo</Rotulo>
            <Escolha id="i-tipo" value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoInsumo)}>
              {TIPOS_INSUMO.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Escolha>
          </div>
          <div>
            <Rotulo htmlFor="i-un">Controlar em</Rotulo>
            <Escolha id="i-un" value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeInsumo)}>
              {(Object.keys(UNIDADES) as UnidadeInsumo[]).map((u) => (
                <option key={u} value={u}>{UNIDADES[u].nome}</option>
              ))}
            </Escolha>
          </div>
        </div>

        {temCompra && (
          <div>
            <Rotulo htmlFor="i-por" dica="opcional">
              Cada {tipo === 'chapa' ? 'chapa' : 'barra'} comprada tem
            </Rotulo>
            <div className="flex items-center gap-2">
              <Entrada id="i-por" inputMode="decimal" value={porCompra} onChange={(e) => setPorCompra(e.target.value)} className="w-28 text-right" />
              <span className="text-[14px] text-muted">{un}</span>
            </div>
            <p className="mt-1 text-[12px] text-faint">
              Com isso a compra é lançada em {tipo === 'chapa' ? 'chapas' : 'barras'} e a contagem aceita {tipo === 'chapa' ? 'chapas' : 'barras'} inteiras + sobra.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="i-preco">{p ? `Preço da ${p[0]} (R$)` : `Custo por ${un} (R$)`}</Rotulo>
            <Entrada id="i-preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} className="text-right" />
            {p && por && Number.isFinite(custo) && custo > 0 && (
              <p className="tnum mt-1 text-[12px] text-faint">= {brl(custo)} por {un}</p>
            )}
          </div>
          <div>
            <Rotulo htmlFor="i-min" dica={un}>Estoque mínimo</Rotulo>
            <Entrada id="i-min" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="text-right" placeholder="0" />
            {p && por && Number.isFinite(nMin) && nMin > 0 && (
              <p className="tnum mt-1 text-[12px] text-faint">≈ {numero(nMin / por, 1)} {p[1]}</p>
            )}
          </div>
        </div>
        <p className="-mt-2 text-[12px] text-faint">
          Quando o saldo chegar no mínimo, o insumo aparece para repor no Início e no Estoque. Mínimo zero: sem alerta.
          {' '}O custo muda sozinho pela média a cada compra lançada com preço.
        </p>

        {novo && (
          <div>
            <Rotulo htmlFor="i-hoje" dica="opcional">Quanto tem hoje ({un})</Rotulo>
            <Entrada id="i-hoje" inputMode="decimal" value={saldoHoje} onChange={(e) => setSaldoHoje(e.target.value)} className="w-40 text-right" />
            <p className="mt-1 text-[12px] text-faint">Em branco, começa em zero e entra na próxima contagem.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="i-cod" dica="opcional">Código</Rotulo>
            <Entrada id="i-cod" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className="font-mono" placeholder="Ex.: T2030" />
            <p className="mt-1 text-[12px] text-faint">O mesmo código do material no cálculo do orçamento.</p>
          </div>
        </div>

        <div>
          <Rotulo htmlFor="i-obs" dica="opcional">Observação</Rotulo>
          <Texto id="i-obs" value={obs} onChange={(e) => setObs(e.target.value)} className="min-h-[60px]" placeholder="Ex.: inox 304, parede 1,2 mm" />
        </div>

        {!novo && (
          <label className="flex items-start gap-2.5 text-[14px] text-body">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo" />
            <span>
              Insumo ativo
              <span className="block text-[12px] text-faint">Desativado some da compra e da contagem. O histórico continua.</span>
            </span>
          </label>
        )}
        {erro && <p className="text-[13px] text-warn">{erro}</p>}
      </div>
    </Modal>
  )
}

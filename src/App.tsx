import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CalendarDays, Factory, FileText, Layers, LayoutDashboard, MessagesSquare, Package, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { irPara, useRota } from '@/lib/rota'
import { ativo } from '@/lib/estagios'
import { hojeISO } from '@/lib/datas'
import { usePerfil } from '@/hooks/usePerfil'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { useConversas } from '@/hooks/useConversas'
import { usePedidos } from '@/hooks/usePedidos'
import { useEstoque } from '@/hooks/useEstoque'
import { useProdutos } from '@/hooks/useProdutos'
import type { Insumo } from '@/lib/types'
import { Shell, type ItemMenu } from '@/components/layout/Shell'
import { Inicio } from '@/components/inicio/Inicio'
import { Orcamentos } from '@/components/orcamentos/Orcamentos'
import { EditorOrcamento } from '@/components/orcamentos/EditorOrcamento'
import { Producao } from '@/components/producao/Producao'
import { PedidoPagina } from '@/components/producao/PedidoPagina'
import { Calendario } from '@/components/calendario/Calendario'
import { Caixa } from '@/components/caixa/Caixa'
import { Estoque } from '@/components/estoque/Estoque'
import { Produtos } from '@/components/produtos/Produtos'
import { ProdutoPagina } from '@/components/produtos/ProdutoPagina'
import { Conversas } from '@/components/conversas/Conversas'
import { Usuarios } from '@/components/Usuarios'
import { Pagina } from '@/components/ui/page'
import { Login } from '@/components/Login'
import { DefinirSenha, EsqueciSenha } from '@/components/Senha'

/** Lista e página do produto dividem os mesmos dados (carregados ao entrar em Produtos) */
function TelasProdutos({ id, insumos, ehAdmin }: { id: string | null; insumos: Insumo[]; ehAdmin: boolean }) {
  const dados = useProdutos()
  return id ? <ProdutoPagina id={id} dados={dados} insumos={insumos} ehAdmin={ehAdmin} /> : <Produtos dados={dados} ehAdmin={ehAdmin} />
}

function Painel({ sessao }: { sessao: Session }) {
  const { perfil, ehAdmin, carregando: carregandoPerfil } = usePerfil(sessao.user.id)
  const rota = useRota()
  const orcamentos = useOrcamentos()
  const conversas = useConversas()
  const pedidos = usePedidos()
  const estoque = useEstoque()

  // Telas só de admin: quem não é admin volta para o início
  const soAdmin = rota.pagina === 'caixa' || rota.pagina === 'usuarios'
  useEffect(() => {
    if (!carregandoPerfil && soAdmin && !ehAdmin) irPara('inicio')
  }, [carregandoPerfil, soAdmin, ehAdmin])

  const hoje = hojeISO()
  const atrasados = pedidos.pedidos.filter((p) => ativo(p.estagio) && p.data_entrega && p.data_entrega < hoje).length

  const itens: ItemMenu[] = [
    { id: 'inicio', nome: 'Início', icone: LayoutDashboard },
    { id: 'conversas', nome: 'Conversas', icone: MessagesSquare, qtd: conversas.naoLidas, tom: 'ok' },
    { id: 'orcamentos', nome: 'Orçamentos', icone: FileText, qtd: orcamentos.itens.length },
    { id: 'producao', nome: 'Produção', icone: Factory, qtd: atrasados, tom: 'warn' },
    { id: 'calendario', nome: 'Calendário', icone: CalendarDays },
    { id: 'estoque', nome: 'Estoque', icone: Package, qtd: estoque.alertas.length, tom: 'warn' },
    { id: 'produtos', nome: 'Produtos', icone: Layers },
    ...(ehAdmin
      ? ([
          { id: 'caixa', nome: 'Caixa', icone: Wallet },
          { id: 'usuarios', nome: 'Usuários', icone: Users },
        ] as ItemMenu[])
      : []),
  ]

  const nome = perfil?.nome || sessao.user.email || 'Usuário'

  function tela() {
    switch (rota.pagina) {
      case 'conversas':
        return (
          <Conversas
            conversas={conversas.conversas}
            carregando={conversas.carregando}
            erro={conversas.erro}
            selecionado={rota.id}
            onSelecionar={(tel) => irPara('conversas', tel)}
            onDefinirEtapa={conversas.definirEtapa}
          />
        )
      case 'orcamentos':
        return (
          <Orcamentos
            pendentes={orcamentos.itens}
            carregando={orcamentos.carregando}
            erro={orcamentos.erro}
            decidir={orcamentos.decidir}
            ehAdmin={ehAdmin}
            pedidos={pedidos.pedidos}
          />
        )
      case 'orcamento':
        // Enquanto o perfil carrega, não mostra o aviso de "só administrador"
        return carregandoPerfil ? null : <EditorOrcamento key={rota.id ?? 'novo'} id={rota.id} ehAdmin={ehAdmin} />
      case 'producao':
        return (
          <Producao
            pedidos={pedidos.pedidos}
            excluidos={pedidos.excluidos}
            carregando={pedidos.carregando}
            erro={pedidos.erro}
          />
        )
      case 'pedido':
        return (
          <PedidoPagina
            id={rota.id}
            pedidos={pedidos.todos}
            carregando={pedidos.carregando}
            ehAdmin={ehAdmin}
            meuId={sessao.user.id}
            excluir={pedidos.excluir}
            restaurar={pedidos.restaurar}
            mudarEstagio={pedidos.mudarEstagio}
            salvar={pedidos.salvar}
            salvarValor={pedidos.salvarValor}
            salvarRastreio={pedidos.salvarRastreio}
          />
        )
      case 'calendario':
        return <Calendario pedidos={pedidos.pedidos} carregando={pedidos.carregando} erro={pedidos.erro} />
      case 'estoque':
        return carregandoPerfil ? null : <Estoque estoque={estoque} ehAdmin={ehAdmin} aba={rota.id} />
      case 'produtos':
      case 'produto':
        return carregandoPerfil ? null : (
          <TelasProdutos id={rota.pagina === 'produto' ? rota.id : null} insumos={estoque.insumos} ehAdmin={ehAdmin} />
        )
      case 'caixa':
        return ehAdmin ? <Caixa pedidos={pedidos.pedidos} todosPedidos={pedidos.todos} acao={rota.id} /> : null
      case 'usuarios':
        return ehAdmin ? (
          <Pagina titulo="Usuários" subtitulo="Quem entra no painel e o que cada um pode fazer." largura="max-w-2xl">
            <Usuarios meuId={sessao.user.id} />
          </Pagina>
        ) : null
      default:
        return (
          <Inicio
            nome={nome}
            ehAdmin={ehAdmin}
            orcamentosPendentes={orcamentos.itens}
            conversasNaoLidas={conversas.naoLidas}
            conversasComRamon={conversas.comRamon}
            pedidos={pedidos.pedidos}
            estoqueAlertas={estoque.alertas}
          />
        )
    }
  }

  return (
    <Shell
      atual={rota.pagina}
      itens={itens}
      nome={nome}
      papel={ehAdmin ? 'Administrador' : 'Operador'}
      onSair={() => supabase.auth.signOut()}
      cheia={rota.pagina === 'conversas'}
    >
      {tela()}
    </Shell>
  )
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [checando, setChecando] = useState(true)
  const [tela, setTela] = useState<'login' | 'esqueci' | 'nova-senha'>('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setChecando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      // Chegou pelo link de recuperação: cai direto na troca de senha.
      if (evento === 'PASSWORD_RECOVERY') setTela('nova-senha')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (checando) return null
  if (tela === 'nova-senha') return <DefinirSenha onPronto={() => setTela('login')} />
  if (!sessao) {
    return tela === 'esqueci' ? (
      <EsqueciSenha onVoltar={() => setTela('login')} />
    ) : (
      <Login onEsqueci={() => setTela('esqueci')} />
    )
  }
  return <Painel sessao={sessao} />
}

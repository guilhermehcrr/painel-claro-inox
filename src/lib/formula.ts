/**
 * Fórmulas da lista técnica: quanto de um insumo vai numa peça, a partir das
 * medidas do pedido. Escreve-se como no Excel em português:
 *
 *   2*A                               duas vezes a altura
 *   X + 2*Y
 *   SE(X>750; 2; 1)*A                 duas pernas quando passa de 750 mm
 *   MÁXIMO(0; INT(X/2/20)-1)*(Y-8)    uma ripa a cada 20 mm, menos uma
 *
 * Medidas, sempre em mm: X largura, Y profundidade, A altura do suporte.
 * N é o número de níveis.
 * Funções: SE, INT (arredonda para baixo), TETO (para cima), ARRED, MÁXIMO, MÍNIMO, ABS.
 * Os valores dentro da função se separam com ponto e vírgula.
 * Decimal com vírgula (1,5). "1.200" é mil e duzentos, como no resto do painel.
 *
 * Sem eval: a fórmula é lida por um analisador próprio, que só conhece
 * números, as quatro letras e as funções acima.
 */

export interface Medidas {
  X: number
  Y: number
  A: number
  N: number
}

export const VARIAVEIS: { id: keyof Medidas; nome: string; unidade: string }[] = [
  { id: 'X', nome: 'Largura', unidade: 'mm' },
  { id: 'Y', nome: 'Profundidade', unidade: 'mm' },
  { id: 'A', nome: 'Altura do suporte', unidade: 'mm' },
  { id: 'N', nome: 'Níveis', unidade: '' },
]

/** Medidas do exemplo do cálculo do Ramon (X=570, Y=360), suporte padrão */
export const MEDIDAS_PADRAO: Medidas = { X: 570, Y: 360, A: 350, N: 3 }

export class ErroFormula extends Error {}

type No =
  | { t: 'num'; v: number }
  | { t: 'var'; n: keyof Medidas }
  | { t: 'neg'; a: No }
  | { t: 'op'; op: string; a: No; b: No }
  | { t: 'fn'; f: string; args: No[] }

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'sim'; v: string }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Mesmo critério do campo de valor: "1.200" é milhar, "1,5" e "1.5" são decimais */
function lerNumero(txt: string): number {
  if (txt.includes(',')) return Number(txt.replace(/\./g, '').replace(',', '.'))
  if (/^\d{1,3}(\.\d{3})+$/.test(txt)) return Number(txt.replace(/\./g, ''))
  return Number(txt)
}

function tokens(formula: string): Token[] {
  const s = formula.replace(/×/g, '*')
  const out: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    const num = /^\d+(?:[.,]\d+)*/.exec(s.slice(i))
    if (num) {
      const txt = num[0]
      // "1,2,3": vírgula usada para separar valores
      if ((txt.match(/,/g) ?? []).length > 1) throw new ErroFormula(SEPARADOR)
      const v = lerNumero(txt)
      if (!Number.isFinite(v)) throw new ErroFormula(`Número que não entendi: ${txt}`)
      out.push({ t: 'num', v })
      i += txt.length
      continue
    }
    const id = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_.]*/.exec(s.slice(i))
    if (id) {
      out.push({ t: 'id', v: id[0] })
      i += id[0].length
      continue
    }
    const dois = s.slice(i, i + 2)
    if (dois === '<=' || dois === '>=' || dois === '<>') {
      out.push({ t: 'sim', v: dois })
      i += 2
      continue
    }
    if ('+-*/();<>='.includes(c)) {
      out.push({ t: 'sim', v: c })
      i++
      continue
    }
    if (c === ',') throw new ErroFormula(SEPARADOR)
    throw new ErroFormula(`Não entendi o sinal “${c}”.`)
  }
  return out
}

const SEPARADOR = 'Separe os valores da função com ponto e vírgula, como no Excel: SE(X>750; 2; 1).'

/** Funções aceitas: nome sem acento e sem ponto -> [mínimo, máximo] de valores */
const FUNCOES: Record<string, { nome: string; min: number; max: number }> = {
  SE: { nome: 'SE', min: 3, max: 3 },
  INT: { nome: 'INT', min: 1, max: 1 },
  TETO: { nome: 'TETO', min: 1, max: 1 },
  ARRED: { nome: 'ARRED', min: 1, max: 2 },
  ARREDONDAR: { nome: 'ARRED', min: 1, max: 2 },
  MAXIMO: { nome: 'MÁXIMO', min: 1, max: 20 },
  MAX: { nome: 'MÁXIMO', min: 1, max: 20 },
  MINIMO: { nome: 'MÍNIMO', min: 1, max: 20 },
  MIN: { nome: 'MÍNIMO', min: 1, max: 20 },
  ABS: { nome: 'ABS', min: 1, max: 1 },
}

function analisar(formula: string): No {
  const tk = tokens(formula)
  if (!tk.length) throw new ErroFormula('Escreva a fórmula.')
  let p = 0
  const ver = () => tk[p]
  const eh = (v: string) => tk[p]?.t === 'sim' && tk[p].v === v

  function comparacao(): No {
    let a = soma()
    const t = ver()
    if (t?.t === 'sim' && ['<', '>', '<=', '>=', '=', '<>'].includes(t.v)) {
      p++
      a = { t: 'op', op: t.v, a, b: soma() }
    }
    return a
  }
  function soma(): No {
    let a = produto()
    while (eh('+') || eh('-')) {
      const op = (tk[p++] as { v: string }).v
      a = { t: 'op', op, a, b: produto() }
    }
    return a
  }
  function produto(): No {
    let a = unario()
    while (eh('*') || eh('/')) {
      const op = (tk[p++] as { v: string }).v
      a = { t: 'op', op, a, b: unario() }
    }
    return a
  }
  function unario(): No {
    if (eh('-')) {
      p++
      return { t: 'neg', a: unario() }
    }
    if (eh('+')) {
      p++
      return unario()
    }
    return primario()
  }
  function primario(): No {
    const t = ver()
    if (!t) throw new ErroFormula('A fórmula termina no meio da conta.')
    if (t.t === 'num') {
      p++
      return { t: 'num', v: t.v }
    }
    if (t.t === 'id') {
      p++
      const nome = semAcento(t.v).toUpperCase()
      if (eh('(')) {
        const f = FUNCOES[nome.replace(/\./g, '')]
        if (!f) throw new ErroFormula(`Não conheço a função “${t.v}”. Use SE, INT, TETO, ARRED, MÁXIMO ou MÍNIMO.`)
        p++
        const args: No[] = []
        if (!eh(')')) {
          args.push(comparacao())
          while (eh(';')) {
            p++
            args.push(comparacao())
          }
        }
        if (!eh(')')) throw new ErroFormula(`Falta fechar o parêntese de ${f.nome}.`)
        p++
        if (args.length < f.min || args.length > f.max) {
          throw new ErroFormula(
            f.nome === 'SE'
              ? 'SE precisa de três partes: SE(condição; valor se sim; valor se não).'
              : `${f.nome} recebeu ${args.length} ${args.length === 1 ? 'valor' : 'valores'}.`,
          )
        }
        return { t: 'fn', f: f.nome, args }
      }
      if (nome === 'X' || nome === 'Y' || nome === 'A' || nome === 'N') return { t: 'var', n: nome }
      throw new ErroFormula(`Não conheço “${t.v}”. As medidas são X, Y, A e N.`)
    }
    if (eh('(')) {
      p++
      const dentro = comparacao()
      if (!eh(')')) throw new ErroFormula('Falta fechar um parêntese.')
      p++
      return dentro
    }
    if (eh(';')) throw new ErroFormula('Ponto e vírgula só serve para separar os valores dentro de uma função.')
    throw new ErroFormula(`Sobrou um “${(t as { v: string }).v}” fora do lugar.`)
  }

  const raiz = comparacao()
  if (p < tk.length) {
    const t = tk[p]
    if (t.t === 'sim' && t.v === ')') throw new ErroFormula('Tem um parêntese fechando sem ter aberto.')
    if (t.t === 'sim' && t.v === ';') throw new ErroFormula('Ponto e vírgula só serve para separar os valores dentro de uma função.')
    throw new ErroFormula('Faltou um sinal (+ − * /) entre dois valores.')
  }
  return raiz
}

function calcularNo(n: No, m: Medidas): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var':
      return Number(m[n.n])
    case 'neg':
      return -calcularNo(n.a, m)
    case 'op': {
      const a = calcularNo(n.a, m)
      const b = calcularNo(n.b, m)
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/':
          if (b === 0) throw new ErroFormula('Divisão por zero com essas medidas.')
          return a / b
        case '<': return a < b ? 1 : 0
        case '>': return a > b ? 1 : 0
        case '<=': return a <= b ? 1 : 0
        case '>=': return a >= b ? 1 : 0
        case '=': return a === b ? 1 : 0
        default: return a !== b ? 1 : 0
      }
    }
    case 'fn': {
      if (n.f === 'SE') return calcularNo(n.args[0], m) !== 0 ? calcularNo(n.args[1], m) : calcularNo(n.args[2], m)
      const v = n.args.map((a) => calcularNo(a, m))
      // Arredonda antes de cortar: 18,000000001 / 3 não pode virar 5
      const limpo = (x: number) => Math.round(x * 1e9) / 1e9
      switch (n.f) {
        case 'INT': return Math.floor(limpo(v[0]))
        case 'TETO': return Math.ceil(limpo(v[0]))
        case 'ARRED': {
          const f = 10 ** (v[1] ?? 0)
          return Math.round(v[0] * f) / f
        }
        case 'MÁXIMO': return Math.max(...v)
        case 'MÍNIMO': return Math.min(...v)
        default: return Math.abs(v[0])
      }
    }
  }
}

/** Confere a fórmula sem calcular. Devolve a mensagem de erro, ou null se está certa. */
export function erroDaFormula(formula: string): string | null {
  try {
    analisar(formula)
    return null
  } catch (e) {
    return e instanceof ErroFormula ? e.message : 'Fórmula com erro.'
  }
}

const cache = new Map<string, No>()

/** Calcula a fórmula com as medidas. Lança ErroFormula com a mensagem para a tela. */
export function calcularFormula(formula: string, m: Medidas): number {
  let arvore = cache.get(formula)
  if (!arvore) {
    arvore = analisar(formula)
    cache.set(formula, arvore)
  }
  const r = calcularNo(arvore, m)
  if (!Number.isFinite(r)) throw new ErroFormula('A conta não deu um número com essas medidas.')
  return r
}

/** Versão que não lança: { valor } ou { erro } */
export function tentarFormula(formula: string, m: Medidas): { valor: number; erro?: undefined } | { valor?: undefined; erro: string } {
  try {
    return { valor: calcularFormula(formula, m) }
  } catch (e) {
    return { erro: e instanceof ErroFormula ? e.message : 'Fórmula com erro.' }
  }
}

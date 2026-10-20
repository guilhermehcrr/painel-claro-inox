import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, Bot, Check, Clock, FileText, Image, MapPin, Mic, Sticker, User, Video } from 'lucide-react'
import type { Mensagem } from '@/lib/types'
import { hora } from '@/lib/format'
import { cn } from '@/lib/utils'

const MIDIA = {
  audio: ['Áudio', Mic],
  imagem: ['Foto', Image],
  video: ['Vídeo', Video],
  documento: ['Documento', FileText],
  figurinha: ['Figurinha', Sticker],
  localizacao: ['Localização', MapPin],
  contato: ['Contato', User],
  outro: ['Mensagem', FileText],
} as const

function Conteudo({ m }: { m: Mensagem }) {
  if (m.tipo === 'texto') {
    return <p className="whitespace-pre-wrap break-words">{m.texto}</p>
  }

  const [rotulo, Icone] = MIDIA[m.tipo] ?? MIDIA.outro
  const foto = m.tipo === 'imagem' && m.midia_url

  return (
    <div className="space-y-1">
      {foto && (
        <a href={m.midia_url!} target="_blank" rel="noreferrer" className="block">
          <img
            src={m.midia_url!}
            alt={m.texto ?? 'Foto'}
            loading="lazy"
            className="max-h-56 w-full rounded-lg object-cover"
          />
        </a>
      )}
      {!foto && (
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {m.tipo === 'documento' && m.arquivo ? (
            m.midia_url ? (
              <a href={m.midia_url} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2">
                {m.arquivo}
              </a>
            ) : (
              <span className="truncate">{m.arquivo}</span>
            )
          ) : (
            rotulo
          )}
        </div>
      )}
      {m.tipo === 'audio' ? (
        <p className={cn('whitespace-pre-wrap break-words', m.texto ? 'italic' : 'text-[12px] text-faint')}>
          {m.texto ? `“${m.texto}”` : 'Sem transcrição'}
        </p>
      ) : (
        m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>
      )}
    </div>
  )
}

/** Tempo para o WhatsApp confirmar o envio antes de o painel avisar. */
const ESPERA_MS = 90_000

/**
 * ✓ = o WhatsApp confirmou que a mensagem saiu.
 * Relógio = enviando. Aviso = o WhatsApp não confirmou (só para as do Ramon e
 * os avisos automáticos, que são as que ele precisa saber se chegaram).
 */
function Situacao({ m }: { m: Mensagem }) {
  const pendente = m.direcao === 'saida' && !m.importada && !m.wa_id && (m.autor === 'ramon' || m.autor === 'sistema')
  const idade = Date.now() - new Date(m.criado_em).getTime()
  const [, redesenhar] = useState(0)

  useEffect(() => {
    if (!pendente || idade >= ESPERA_MS) return
    const t = setTimeout(() => redesenhar((n) => n + 1), ESPERA_MS - idade + 500)
    return () => clearTimeout(t)
  }, [pendente, idade])

  if (m.direcao !== 'saida' || m.importada) return null
  if (m.wa_id) return <Check className="h-3 w-3" strokeWidth={2.25} aria-label="Enviada" />
  if (!pendente) return null
  if (idade < ESPERA_MS) return <Clock className="h-3 w-3" strokeWidth={2} aria-label="Enviando" />
  return (
    <span className="flex items-center gap-0.5 font-medium text-warn">
      <AlertTriangle className="h-3 w-3" strokeWidth={2} />
      não confirmada, confira no celular
    </span>
  )
}

const AUTOR = {
  ia: { nome: 'IA', icone: Bot, bolha: 'bg-indigo-tint', texto: 'text-indigo' },
  ramon: { nome: 'Ramon', icone: User, bolha: 'bg-ok-tint', texto: 'text-ok' },
  sistema: { nome: 'Aviso automático', icone: Bell, bolha: 'bg-aco-tint', texto: 'text-aco' },
} as const

export function BolhaMensagem({ m }: { m: Mensagem }) {
  const minha = m.direcao === 'saida'
  const a = minha ? AUTOR[m.autor as keyof typeof AUTOR] ?? AUTOR.ramon : null
  return (
    <div className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-snug text-ink shadow-[0_1px_0_rgba(11,13,20,.06)] sm:max-w-[70%]',
          !minha && 'rounded-tl-sm bg-card',
          a && `rounded-tr-sm ${a.bolha}`,
        )}
      >
        {a && (
          <div className={cn('mb-0.5 flex items-center gap-1 text-[11px] font-medium', a.texto)}>
            <a.icone className="h-3 w-3" strokeWidth={2} />
            {a.nome}
          </div>
        )}
        <Conteudo m={m} />
        <div className="tnum mt-0.5 flex items-center justify-end gap-1 text-[10px] text-faint">
          {hora(m.criado_em)}
          <Situacao m={m} />
        </div>
      </div>
    </div>
  )
}

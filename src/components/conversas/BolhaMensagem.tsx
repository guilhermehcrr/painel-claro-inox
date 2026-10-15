import { Bot, FileText, Image, MapPin, Mic, Sticker, User, Video } from 'lucide-react'
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

export function BolhaMensagem({ m }: { m: Mensagem }) {
  const minha = m.direcao === 'saida'
  return (
    <div className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-snug text-ink shadow-[0_1px_0_rgba(11,13,20,.06)] sm:max-w-[70%]',
          !minha && 'rounded-tl-sm bg-card',
          minha && m.autor === 'ia' && 'rounded-tr-sm bg-indigo-tint',
          minha && m.autor === 'ramon' && 'rounded-tr-sm bg-ok-tint',
        )}
      >
        {minha && (
          <div
            className={cn(
              'mb-0.5 flex items-center gap-1 text-[11px] font-medium',
              m.autor === 'ia' ? 'text-indigo' : 'text-ok',
            )}
          >
            {m.autor === 'ia' ? <Bot className="h-3 w-3" strokeWidth={2} /> : <User className="h-3 w-3" strokeWidth={2} />}
            {m.autor === 'ia' ? 'IA' : 'Ramon'}
          </div>
        )}
        <Conteudo m={m} />
        <div className="tnum mt-0.5 text-right text-[10px] text-faint">{hora(m.criado_em)}</div>
      </div>
    </div>
  )
}

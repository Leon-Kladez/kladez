import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react'
import api from '~/lib/api'
import classNames from '~/lib/classNames'
import { t } from '../../../constants/i18n'

const MAX_SECONDS = 120

type Hint = { text: string; link?: { href: string; label: string } } | null

/**
 * «Кладезъ»: микрофон в чате. Нажали — говорите, нажали ещё раз — запись уходит программе
 * «Распознавание речи» (whisper.cpp) на этом компьютере, текст встаёт в поле ввода.
 * Голос никуда не отправляется: распознавание Chrome не используем — оно ходит в Google.
 */
export default function SpeechButton({ disabled, onText }: { disabled?: boolean; onText: (text: string) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [hint, setHint] = useState<Hint>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | null>(null)

  const { data: status } = useQuery({
    queryKey: ['speechStatus'],
    queryFn: () => api.getSpeechStatus(),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!hint) return
    const id = window.setTimeout(() => setHint(null), hint.link ? 15_000 : 7_000)
    return () => window.clearTimeout(id)
  }, [hint])

  // Ушли со страницы посреди записи — отпустить микрофон.
  useEffect(() => () => stopTracks(), [])

  function stopTracks() {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    recorder.current?.stream.getTracks().forEach((track) => track.stop())
  }

  async function send(blob: Blob) {
    setState('working')
    try {
      const res = await api.transcribeSpeech(blob)
      if ('text' in res) {
        if (res.text) onText(res.text)
        else setHint({ text: t('speech.empty') })
      } else {
        setHint({ text: res.message })
      }
    } finally {
      setState('idle')
    }
  }

  async function start() {
    setHint(null)
    if (!status?.installed) {
      setHint(
        status?.installing
          ? { text: t('speech.installing'), link: { href: '/supply-depot', label: t('speech.installLink') } }
          : { text: t('speech.install'), link: { href: '/supply-depot', label: t('speech.installLink') } }
      )
      return
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setHint({ text: t('speech.needsLocalhost') })
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch (err) {
      const name = (err as DOMException)?.name
      setHint({ text: name === 'NotFoundError' || name === 'OverconstrainedError' ? t('speech.noMic') : t('speech.denied') })
      return
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) =>
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    )
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunks.current = []
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data)
    rec.onstop = () => {
      stopTracks()
      const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
      chunks.current = []
      if (blob.size > 0) send(blob)
      else setState('idle')
    }
    recorder.current = rec
    rec.start()
    setSeconds(0)
    setState('recording')
    const began = Date.now()
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - began) / 1000)
      setSeconds(s)
      if (s >= MAX_SECONDS) stop()
    }, 250)
  }

  function stop() {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
  }

  const label = state === 'recording' ? t('speech.stop') : t('speech.mic')

  return (
    <div className="relative mb-2 flex-shrink-0">
      {(hint || state !== 'idle') && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary shadow-lg"
        >
          {state === 'recording' && t('speech.recording', { s: seconds })}
          {state === 'working' && t('speech.working')}
          {state === 'idle' && hint && (
            <>
              {hint.text}
              {hint.link && (
                <a href={hint.link.href} className="mt-1 block font-semibold text-desert-green underline">
                  {hint.link.label}
                </a>
              )}
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => (state === 'recording' ? stop() : state === 'idle' ? start() : undefined)}
        disabled={(disabled && state !== 'recording') || state === 'working'}
        aria-label={label}
        title={label}
        aria-pressed={state === 'recording'}
        className={classNames(
          'p-3 rounded-lg transition-colors',
          state === 'recording'
            ? 'bg-desert-red text-white animate-pulse'
            : disabled || state === 'working'
            ? 'bg-border-default text-text-muted cursor-not-allowed'
            : 'border border-border-default text-text-secondary hover:bg-surface-secondary'
        )}
      >
        {state === 'working' ? (
          <div className="h-6 w-6 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
        ) : state === 'recording' ? (
          <IconPlayerStopFilled className="h-6 w-6" aria-hidden="true" />
        ) : (
          <IconMicrophone className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

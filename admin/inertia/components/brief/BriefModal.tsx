import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react'
import { chooseBriefSrc, type BriefSources } from '~/lib/brief'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: окно с роликом «Бриф». Автозапуск со звуком; если браузер не даёт
 * включить звук сам — играем без звука и показываем «Включить звук».
 * Обычные кнопки видео (пауза, перемотка) — у самого плеера.
 */
export default function BriefModal({
  sources,
  open,
  onClose,
}: {
  sources: BriefSources
  open: boolean
  onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [needsSound, setNeedsSound] = useState(false)
  const [ended, setEnded] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSrc(chooseBriefSrc(sources, { width: window.innerWidth, height: window.innerHeight }))
    setEnded(false)
  }, [open, sources])

  useEffect(() => {
    const el = video.current
    if (!open || !el || !src) return
    el.muted = false
    setMuted(false)
    setNeedsSound(false)
    el.play().catch(() => {
      // Автозапуск со звуком запрещён браузером — тихо, с кнопкой «Включить звук».
      el.muted = true
      setMuted(true)
      setNeedsSound(true)
      el.play().catch(() => undefined)
    })
  }, [open, src])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !src) return null

  const toggleSound = () => {
    const el = video.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
    setNeedsSound(false)
    if (el.paused) el.play().catch(() => undefined)
  }

  let soundLabel = t('brief.mute')
  if (needsSound) soundLabel = t('brief.soundOn')
  else if (muted) soundLabel = t('brief.unmute')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('brief.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-5xl flex-col bg-black sm:h-auto sm:overflow-hidden sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-primary px-3 py-2 text-text-primary">
          <h2 className="text-lg font-semibold">{t('brief.title')}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              className="inline-flex items-center gap-1 rounded border border-border-default px-3 py-1.5 text-sm hover:bg-surface-secondary"
            >
              {muted ? (
                <IconVolumeOff className="size-5" aria-hidden="true" />
              ) : (
                <IconVolume className="size-5" aria-hidden="true" />
              )}
              {soundLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded bg-desert-green px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              <IconX className="size-5" aria-hidden="true" />
              {t('brief.skip')}
            </button>
          </div>
        </div>
        <div className="relative flex flex-1 items-center justify-center bg-black">
          <video
            ref={video}
            src={src}
            controls
            playsInline
            preload="auto"
            onEnded={() => setEnded(true)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            className="max-h-[calc(100vh-3.5rem)] w-full sm:max-h-[80vh]"
          />
          {ended && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center">
              <p className="text-xl font-semibold text-white">{t('brief.endText')}</p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.visit('/library')
                }}
                className="rounded-lg bg-desert-green px-6 py-3 text-lg font-semibold text-white hover:brightness-110"
              >
                {t('brief.start')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

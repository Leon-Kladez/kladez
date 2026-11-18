import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { readFile, unlink } from 'node:fs/promises'
import Service from '#models/service'
import { SERVICE_NAMES } from '../../constants/service_names.js'
import { SPEECH_MAX_UPLOAD, speechLanguage } from '../../constants/speech.js'
import { t } from '../../constants/i18n/index.js'
import { cleanTranscript } from '../utils/speech_text.js'

/** Сервер распознавания речи: в Кладезе — по имени программы в общей сети Docker. */
export function whisperBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.NODE_ENV === 'production' ? `http://${SERVICE_NAMES.SPEECH}:8080` : 'http://localhost:8091'
}

/**
 * «Кладезъ»: микрофон в чате. Браузер записывает голос (webm/opus), панель передаёт запись
 * программе «Распознавание речи» (whisper.cpp) на этом же компьютере и возвращает текст.
 * Ни голос, ни текст никуда не уходят.
 */
export default class SpeechController {
  async status() {
    const service = await Service.query().where('service_name', SERVICE_NAMES.SPEECH).first()
    return {
      installed: !!service?.installed,
      installing: service?.installation_status === 'installing',
    }
  }

  async transcribe({ request, response }: HttpContext) {
    const file = request.file('audio', { size: SPEECH_MAX_UPLOAD })
    if (!file || !file.tmpPath || !file.isValid) {
      return response.badRequest({ message: t('speech.noAudio') })
    }
    const tmpPath = file.tmpPath
    // Запись голоса не храним ни секунды дольше нужного (0.1.33: временные файлы оставались).
    const forget = () => unlink(tmpPath).catch(() => {})
    const service = await Service.query().where('service_name', SERVICE_NAMES.SPEECH).first()
    if (!service?.installed) {
      await forget()
      return response.conflict({ message: t('speech.notInstalled') })
    }
    try {
      const audio = await readFile(tmpPath)
      await forget()
      const form = new FormData()
      const type = file.headers?.['content-type'] ?? 'audio/webm'
      form.append('file', new Blob([audio], { type }), file.clientName || 'speech.webm')
      form.append('response_format', 'json')
      form.append('temperature', '0')
      // Язык интерфейса: угадывание на короткой фразе ошибается («Привет» → индонезийский).
      form.append('language', speechLanguage(request.input('language')))
      const res = await fetch(`${whisperBaseUrl()}/inference`, {
        method: 'POST',
        body: form,
        // Минута речи на слабом процессоре — до полуминуты; с запасом.
        signal: AbortSignal.timeout(180_000),
      })
      if (!res.ok) {
        logger.warn(`[Speech] whisper answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
        return response.status(502).send({ message: t('speech.failed') })
      }
      const data = (await res.json()) as { text?: string }
      return { text: cleanTranscript(data.text ?? '') }
    } catch (error) {
      logger.warn(`[Speech] transcription failed: ${(error as Error)?.message ?? error}`)
      return response.status(502).send({ message: t('speech.notRunning') })
    }
  }
}

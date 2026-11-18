/**
 * «Кладезъ»: распознавание речи без интернета — микрофон в чате.
 *
 * whisper.cpp (сервер и ffmpeg в одном образе, 511 МБ) + модель Whisper «small» в сжатом виде
 * (190 МБ). Голос никуда не уходит — всё на этом компьютере. Встроенное распознавание Chrome
 * не годится: оно отправляет голос на серверы Google.
 *
 * Почему «small», а не «base» (0.1.33): на живом голосе с микрофона автора «base» слышала
 * «Привет, как белар!» / «Кантила» вместо «Привет, как дела?», а одну запись приняла за
 * индонезийскую. «small» с заданным языком — все три фразы верно, 9–12 с на i3-6300.
 * Язык берём из интерфейса Кладезя: угадывание на коротких фразах ненадёжно.
 */

/** whisper.cpp v1.9.5 (6 окт. 2026): у проекта нет тегов-версий у образа, только main-<коммит>. */
export const WHISPER_IMAGE = 'ghcr.io/ggml-org/whisper.cpp:main-d1be6fde11ac6e0407606b4e42fe72d34add8037'
export const WHISPER_IMAGE_VERSION = '1.9.5'

export const WHISPER_MODEL = {
  filename: 'ggml-small-q5_1.bin',
  bytes: 190_085_487,
  sha256: 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb',
  urls: [
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
  ],
}

/** Модели прежних версий Кладезя — после перехода удаляются, чтобы не занимать место. */
export const WHISPER_OLD_MODELS = ['ggml-base-q5_1.bin']

/** Языки, которые чат передаёт распознаванию (язык интерфейса); остальное — «угадай сам». */
export const SPEECH_LANGUAGES = ['ru', 'en'] as const

export function speechLanguage(value: unknown): string {
  return typeof value === 'string' && (SPEECH_LANGUAGES as readonly string[]).includes(value) ? value : 'auto'
}

/** Папка программы в библиотеке (в контейнере — /models). */
export const WHISPER_STORAGE_DIR = 'whisper'
export const WHISPER_START_SCRIPT = 'kladez-start.sh'

/**
 * Запуск сервера: у образа ENTRYPOINT ["bash","-c"], а Кладезъ делит команду по пробелам —
 * поэтому всё нужное лежит в скрипте рядом с моделью, и команда — одно слово (путь к нему).
 * Не больше 4 потоков: на слабом компьютере рядом работает ИИ-помощник. Язык по умолчанию —
 * «угадай», но чат всегда присылает язык интерфейса.
 */
export function whisperStartScript(): string {
  return [
    '#!/bin/bash',
    '# «Кладезъ»: сервер распознавания речи (whisper.cpp). Файл пишет панель при установке.',
    'THREADS=$(nproc); [ "$THREADS" -gt 4 ] && THREADS=4',
    `exec whisper-server --host 0.0.0.0 --port 8080 -m /models/${WHISPER_MODEL.filename} -l auto -t "$THREADS" --convert`,
    '',
  ].join('\n')
}

/** Самая длинная запись, которую принимаем: ~2 минуты речи в opus — меньше 2 МБ. */
export const SPEECH_MAX_UPLOAD = '25mb'
export const SPEECH_MAX_SECONDS = 120

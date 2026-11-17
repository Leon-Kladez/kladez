/**
 * «Кладезъ»: распознавание речи без интернета — микрофон в чате.
 *
 * whisper.cpp (сервер и ffmpeg в одном образе, 511 МБ) + модель Whisper «base» в сжатом виде
 * (60 МБ). Голос никуда не уходит — всё на этом компьютере. Встроенное распознавание Chrome
 * не годится: оно отправляет голос на серверы Google.
 *
 * Замер на i3-6300 (4 потока, без видеокарты), 18.11.2026, фраза 11 с по-русски:
 * «small» (190 МБ) — 20 с, слово в слово; «base» (60 МБ) — 5 с, пропал один союз «и».
 * Whisper всегда считает окно в 30 с, поэтому и 3-секундная фраза — те же 5 / 20 с.
 */

/** whisper.cpp v1.9.5 (6 окт. 2026): у проекта нет тегов-версий у образа, только main-<коммит>. */
export const WHISPER_IMAGE = 'ghcr.io/ggml-org/whisper.cpp:main-d1be6fde11ac6e0407606b4e42fe72d34add8037'
export const WHISPER_IMAGE_VERSION = '1.9.5'

export const WHISPER_MODEL = {
  filename: 'ggml-base-q5_1.bin',
  bytes: 59_707_625,
  sha256: '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898',
  urls: [
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  ],
}

/** Папка программы в библиотеке (в контейнере — /models). */
export const WHISPER_STORAGE_DIR = 'whisper'
export const WHISPER_START_SCRIPT = 'kladez-start.sh'

/**
 * Запуск сервера: у образа ENTRYPOINT ["bash","-c"], а Кладезъ делит команду по пробелам —
 * поэтому всё нужное лежит в скрипте рядом с моделью, и команда — одно слово (путь к нему).
 * Не больше 4 потоков: на слабом компьютере рядом работает ИИ-помощник.
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

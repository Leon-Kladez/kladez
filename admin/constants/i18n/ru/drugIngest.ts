import type { drugIngestEn } from '../en/drugIngest.js'

export const drugIngestRu: Record<keyof typeof drugIngestEn, string> = {
  'drugIngest.downloadFailed': 'Скачать не удалось — программа сама попробует ещё раз. Если ошибка не уходит, нажмите «Скачать данные FDA». Уже скачанные части сохранятся, и скачивание продолжится с того же места.',
  'drugIngest.downloadDone': 'Все части скачаны. Теперь добавляем их в поиск.',
  'drugIngest.pullingPart': 'Скачивается часть {n} из {total} — всего около 1,7 ГБ.',
  'drugIngest.readingManifest': 'Читаем список файлов openFDA…',
  'drugIngest.notStarted': 'Ещё не начато.',
  'drugIngest.ingestFailed': 'Добавить в поиск не удалось — нажмите «Добавить в поиск», чтобы повторить из уже скачанных файлов (скачивать заново не нужно). Уже добавленные инструкции сохранятся.',
  'drugIngest.ingestDone': 'Теперь без интернета ищется {n} инструкция.|Теперь без интернета ищутся {n} инструкции.|Теперь без интернета ищутся {n} инструкций.',
  'drugIngest.writingPart': 'Записываем часть {n} из {total} в базу.',
  'drugIngest.writing': 'Записываем инструкции в базу.',
  'drugIngest.waiting': 'Ждём, пока данные скачаются.',
  'drugIngest.elapsed': 'Прошло {time}',
  'drugIngest.thisPart': 'в этой части {size}',
  'drugIngest.left': 'осталось ~{time}',
  'drugIngest.estimate': '(примерно)',
  'drugIngest.downloadPhase': 'Скачать данные FDA',
  'drugIngest.ingestPhase': 'Добавить в поиск',
  'drugIngest.ofLabels': ' из ~{n} инструкций',
  'drugIngest.background': 'Работает в фоне — можно уйти с этой страницы. Поиск включится сам, когда всё будет готово.',
  'drugIngest.version': 'Версия данных FDA: {version}.',
}

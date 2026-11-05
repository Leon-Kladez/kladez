import type { serverBenchmarkMsgEn } from '../en/serverBenchmarkMsg.js'

export const serverBenchmarkMsgRu: Record<keyof typeof serverBenchmarkMsgEn, string> = {
  'server.benchmarkMsg.detecting': 'Определяем оборудование…',
  'server.benchmarkMsg.starting': 'Запускаем проверку…',
  'server.benchmarkMsg.calculating': 'Считаем общую оценку…',
  'server.benchmarkMsg.completed': 'Проверка завершена',
  'server.benchmarkMsg.failed': 'Проверка не удалась: {error}',
  'server.benchmarkMsg.cpuSingle': 'Проверяем процессор (один поток)…',
  'server.benchmarkMsg.cpuMulti': 'Проверяем процессор (потоков: {n})…',
  'server.benchmarkMsg.memory': 'Проверяем память…',
  'server.benchmarkMsg.diskRead': 'Проверяем чтение с диска…',
  'server.benchmarkMsg.diskWrite': 'Проверяем запись на диск…',
  'server.benchmarkMsg.ai': 'Проверяем ИИ…',
  'server.benchmarkMsg.warmup': 'Разогреваем модель ИИ…',
  'server.benchmarkMsg.aiRun': 'Проверяем ИИ ({i} из {total})…',
  'server.benchmarkMsg.pulling': 'Скачиваем инструмент проверки (sysbench)…',
  'server.benchmarkMsg.noSpace': 'Не хватает места на диске, чтобы скачать модель для проверки ИИ ({model}). Нужно около {required}, а свободно только {free}. Освободите место и попробуйте снова.',
}

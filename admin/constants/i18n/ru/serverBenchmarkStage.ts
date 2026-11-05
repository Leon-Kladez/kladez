import type { serverBenchmarkStageEn } from '../en/serverBenchmarkStage.js'

export const serverBenchmarkStageRu: Record<keyof typeof serverBenchmarkStageEn, string> = {
  'server.benchmarkStage.idle': 'Ожидание',
  'server.benchmarkStage.starting': 'Запуск',
  'server.benchmarkStage.detectingHardware': 'Определяем оборудование',
  'server.benchmarkStage.runningCpu': 'Процессор',
  'server.benchmarkStage.runningMemory': 'Память',
  'server.benchmarkStage.runningDiskRead': 'Чтение с диска',
  'server.benchmarkStage.runningDiskWrite': 'Запись на диск',
  'server.benchmarkStage.downloadingAiModel': 'Скачиваем модель ИИ',
  'server.benchmarkStage.runningAi': 'Проверка ИИ',
  'server.benchmarkStage.calculatingScore': 'Подсчёт оценки',
  'server.benchmarkStage.completed': 'Готово',
}

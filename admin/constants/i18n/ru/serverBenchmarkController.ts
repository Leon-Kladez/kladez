import type { serverBenchmarkControllerEn } from '../en/serverBenchmarkController.js'

export const serverBenchmarkControllerRu: Record<keyof typeof serverBenchmarkControllerEn, string> = {
  'server.benchmarkController.aBenchmarkIsAlreadyRunning': 'Проверка уже идёт',
  'server.benchmarkController.anInternalErrorOccurredWhile': 'Во время проверки произошла внутренняя ошибка.',
  'server.benchmarkController.benchmarkStarted': 'Проверка запущена ({benchmarkType})',
  'server.benchmarkController.benchmarkJobAlreadyExists': 'Такая проверка уже есть в очереди',
  'server.benchmarkController.systemBenchmarkStarted': 'Проверка компьютера запущена',
  'server.benchmarkController.aiBenchmarkStarted': 'Проверка ИИ запущена',
  'server.benchmarkController.benchmarkResultNotFound': 'Результат проверки не найден',
  'server.benchmarkController.benchmarkIdIsRequired': 'Не указан номер проверки (benchmark_id)',
  'server.benchmarkController.invalidBuilderTagFormatExpected': 'Неверный позывной. Нужен вид: Word-Word-0000',
}

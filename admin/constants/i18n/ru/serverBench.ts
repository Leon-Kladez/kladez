import type { serverBenchEn } from '../en/serverBench.js'

export const serverBenchRu: Record<keyof typeof serverBenchEn, string> = {
  'serverBench.remoteAi': 'Здесь подключён удалённый ИИ, поэтому скорость ИИ измерена на другом компьютере. Для общей таблицы всё нужно измерять на одном и том же компьютере. Чтобы отправить результат, отключите удалённый ИИ в «Настройки → Модели» и запустите полную проверку снова.',
  'serverBench.rateLimit': 'Отправлять результат можно не чаще раза в час. Подождите немного и попробуйте снова.',
}

import type { serverDockerEn } from '../en/serverDocker.js'

export const serverDockerRu: Record<keyof typeof serverDockerEn, string> = {
  'serverDocker.port': 'порт {port}',
  'serverDocker.somePort': 'нужный порт',
  'serverDocker.portBusyOllama': 'Не удалось запустить: {portText} на этом компьютере уже занят. Обычно это значит, что Ollama уже установлен прямо в системе (не через Кладезъ). Остановите и отключите его (например, «sudo systemctl stop ollama», затем «sudo systemctl disable ollama») и попробуйте снова.',
  'serverDocker.portBusy': 'Не удалось запустить: {portText} на этом компьютере уже занят. Остановите программу, которая его занимает, и попробуйте снова.',
}

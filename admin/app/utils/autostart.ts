import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * «Кладезъ»: запускать ли Кладезъ вместе с Windows.
 *
 * Выбор лежит файлом в библиотеке (storage = папка библиотеки на компьютере), чтобы его видел
 * и Kladez.exe при входе в Windows (installer/windows/launcher: AutostartOffFile), и окошко
 * с переключателем в углу экрана, и эта страница. Есть файл — при входе в Windows Кладезъ
 * не поднимается и память не занимает; открыть его можно ярлыком на рабочем столе.
 */
export function autostartOffFile(): string {
  return join(process.cwd(), 'storage', '.kladez-autostart-off')
}

export function isAutostartOn(): boolean {
  return !existsSync(autostartOffFile())
}

export function setAutostart(on: boolean): void {
  const file = autostartOffFile()
  if (on) {
    if (existsSync(file)) unlinkSync(file)
  } else {
    writeFileSync(
      file,
      'Кладезъ не запускается вместе с Windows. Вернуть: Кладезъ → Настройки → Телефоны, или удалите этот файл.\r\n'
    )
  }
}

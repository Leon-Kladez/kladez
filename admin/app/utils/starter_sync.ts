import { join } from 'node:path'

/**
 * «Кладезъ»: стартовый файл библиотеки при обновлении панели.
 *
 * При первой установке Kiwix стартовый файл копирует pre-install. Но у тех, кто
 * обновился со старой версии, Kiwix уже стоит — и новый стартовый файл (сейчас
 * медицинская Википедия) сам в библиотеку не попадёт, а прежний (Викидия)
 * останется. Здесь — что сделать при запуске панели:
 *
 * - нового стартового файла нет на диске и мы его ещё не клали → скопировать
 *   из образа и записать в kiwix-library.xml (как обычную книгу);
 * - мы его уже клали, а теперь его нет → человек удалил сам, не возвращаем;
 * - прежний стартовый файл лежит на диске → убрать один раз, при переходе на
 *   новый, если это ровно тот файл из образа (совпала SHA-256) и человек не
 *   выбирал его в наборе. Если новый положить не вышло — прежний не трогаем:
 *   библиотека не должна остаться пустой.
 *
 * Последний положенный стартовый файл запоминается в KV `kiwix.starterFile`.
 */
export type StarterFile = { filename: string; sha256: string }

export type StarterSyncDeps = {
  zimDir: string
  bundledPath: string
  exists(path: string): Promise<boolean>
  /** Скопировать файл целиком (через временный файл и переименование). */
  copy(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
  sha256(path: string): Promise<string>
  /** Имена файлов, записанных в kiwix-library.xml. */
  libraryFiles(): Promise<string[]>
  addBook(filename: string): Promise<void>
  removeBook(filename: string): Promise<void>
  /** Человек выбрал этот файл в наборе («Добавить книги» / категории). */
  pickedByPerson(filename: string): Promise<boolean>
  /** Убрать запись о файле из установленных. */
  forgetInstalled(filename: string): Promise<void>
  getLastStarter(): Promise<string | null>
  setLastStarter(filename: string): Promise<void>
}

export type StarterSyncResult = {
  copied: boolean
  registered: boolean
  removed: string[]
  skipped?: 'deleted-by-person' | 'no-bundled-file'
}

export async function syncStarterZim(
  starter: StarterFile,
  previous: readonly StarterFile[],
  deps: StarterSyncDeps
): Promise<StarterSyncResult> {
  const result: StarterSyncResult = { copied: false, registered: false, removed: [] }
  const target = join(deps.zimDir, starter.filename)
  const last = await deps.getLastStarter()
  const transition = last !== starter.filename

  let present = await deps.exists(target)
  if (!present) {
    if (!transition) {
      result.skipped = 'deleted-by-person'
      return result
    }
    if (!(await deps.exists(deps.bundledPath))) {
      result.skipped = 'no-bundled-file'
      return result
    }
    await deps.copy(deps.bundledPath, target)
    result.copied = true
    present = true
  }

  const inLibrary = new Set(await deps.libraryFiles())
  if (!inLibrary.has(starter.filename)) {
    await deps.addBook(starter.filename)
    result.registered = true
  }

  if (transition) {
    for (const old of previous) {
      if (old.filename === starter.filename) continue
      const oldPath = join(deps.zimDir, old.filename)
      if (!(await deps.exists(oldPath))) {
        // Файла уже нет, а запись в библиотеке осталась — читалка показала бы пустую книгу.
        if (inLibrary.has(old.filename)) {
          await deps.removeBook(old.filename)
          result.removed.push(old.filename)
        }
        continue
      }
      if (await deps.pickedByPerson(old.filename)) continue
      if ((await deps.sha256(oldPath)) !== old.sha256) continue
      if (inLibrary.has(old.filename)) await deps.removeBook(old.filename)
      await deps.remove(oldPath)
      await deps.forgetInstalled(old.filename)
      result.removed.push(old.filename)
    }
    await deps.setLastStarter(starter.filename)
  }

  return result
}

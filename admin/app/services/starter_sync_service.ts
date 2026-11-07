import { copyFile, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import logger from '@adonisjs/core/services/logger'
import { PREVIOUS_STARTER_ZIMS, STARTER_ZIM } from '../../constants/kladez.js'
import { syncStarterZim, type StarterSyncResult } from '../utils/starter_sync.js'
import { ZIM_STORAGE_PATH } from '../utils/fs.js'
import { sha256File } from '../utils/meta4.js'
import { KiwixLibraryService } from './kiwix_library_service.js'

/**
 * «Кладезъ»: при запуске панели — положить новый стартовый файл в библиотеку
 * (если Kiwix уже стоит, а файла нет) и убрать прежний. Логика —
 * app/utils/starter_sync.ts; здесь только настоящие диск, xml и база.
 */
export async function runStarterSync(): Promise<StarterSyncResult> {
  const KVStore = (await import('#models/kv_store')).default
  const InstalledResource = (await import('#models/installed_resource')).default
  const library = new KiwixLibraryService()
  const zimDir = join(process.cwd(), ZIM_STORAGE_PATH)

  const rowsFor = (filename: string) =>
    InstalledResource.query()
      .where('resource_type', 'zim')
      .where((q) => q.where('file_path', join(zimDir, filename)).orWhereLike('file_path', `%/${filename}`))

  const result = await syncStarterZim(STARTER_ZIM, PREVIOUS_STARTER_ZIMS, {
    zimDir,
    bundledPath: STARTER_ZIM.bundledPath,
    exists: async (p) => {
      try {
        return (await stat(p)).isFile()
      } catch {
        return false
      }
    },
    copy: async (from, to) => {
      const part = `${to}.part`
      await copyFile(from, part)
      await rename(part, to)
    },
    remove: (p) => rm(p, { force: true }),
    sha256: sha256File,
    libraryFiles: async () => (await library.listBooks()).map((b) => basename(b.path)),
    addBook: (f) => library.addBook(f),
    removeBook: (f) => library.removeBook(f),
    pickedByPerson: async (f) => {
      const rows = await rowsFor(f)
      return rows.some((r) => Boolean(r.collection_ref))
    },
    forgetInstalled: async (f) => {
      await rowsFor(f).delete()
    },
    getLastStarter: () => KVStore.getValue('kiwix.starterFile'),
    setLastStarter: async (f) => {
      await KVStore.setValue('kiwix.starterFile', f)
    },
  })

  if (result.copied || result.registered || result.removed.length) {
    logger.info(
      `[StarterSync] стартовый файл ${STARTER_ZIM.filename}: скопирован=${result.copied}, ` +
        `в библиотеке=${result.registered}, убраны прежние: ${result.removed.join(', ') || 'нет'}`
    )
  } else if (result.skipped) {
    logger.info(`[StarterSync] стартовый файл не кладём: ${result.skipped}`)
  }
  return result
}

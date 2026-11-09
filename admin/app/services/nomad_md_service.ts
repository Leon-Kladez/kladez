import { rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import { ensureDirectoryExists, getFile } from '../utils/fs.js'

/**
 * Manages the user-editable `NOMAD.md` file that is injected as a system prompt
 * during chat completions. The file lives in the admin storage directory
 * (`/app/storage/NOMAD.md` in the container, `/opt/project-nomad/storage/NOMAD.md`
 * on the host), so an end user can also edit it directly on disk. The file is
 * created lazily on the first save — a missing or empty file simply means no
 * custom prompt is injected.
 */
export class NomadMdService {
  // Kladez: «указания-ИИ.md» в папке библиотеки (D:\Kladez\library); раньше — NOMAD.md.
  static STORAGE_PATH = 'storage/указания-ИИ.md'
  static LEGACY_STORAGE_PATH = 'storage/NOMAD.md'

  private get filePath(): string {
    return app.makePath(NomadMdService.STORAGE_PATH)
  }

  /** Старый NOMAD.md переносим под новое имя один раз, если нового файла ещё нет. */
  private async migrateLegacy(): Promise<void> {
    const legacy = app.makePath(NomadMdService.LEGACY_STORAGE_PATH)
    if (existsSync(legacy) && !existsSync(this.filePath)) {
      await rename(legacy, this.filePath).catch(() => {})
    }
  }

  /**
   * Read the raw file contents. Returns an empty string when the file does not
   * exist yet (the editor renders a template client-side in that case).
   */
  async read(): Promise<string> {
    await this.migrateLegacy()
    const content = await getFile(this.filePath, 'string')
    return content ?? ''
  }

  /**
   * Persist the file. Written atomically (tmp file + rename) so a concurrent
   * on-disk edit never observes a half-written file.
   */
  async write(content: string): Promise<void> {
    const filePath = this.filePath
    await ensureDirectoryExists(dirname(filePath))
    const tmpPath = `${filePath}.tmp.${randomUUID()}`
    await writeFile(tmpPath, content, 'utf-8')
    await rename(tmpPath, filePath)
  }

  /**
   * The trimmed contents suitable for injection as a system message, or `null`
   * when the file is missing or blank (so chat behaviour is unchanged).
   */
  async getSystemPrompt(): Promise<string | null> {
    const content = (await this.read()).trim()
    return content.length > 0 ? content : null
  }
}

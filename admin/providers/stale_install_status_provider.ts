import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * «Кладезъ»: снять зависшую отметку «Устанавливается» после перезапуска.
 *
 * Установка и обновление программы идут внутри панели. Если панель перезапустилась посреди них
 * (сбой сети, обновление Кладезя, перезагрузка компьютера), работа обрывается, а отметка в базе
 * остаётся — и карточка навсегда показывает «Устанавливается… Выполняется…», хотя ничего не идёт
 * (так было с ИИ-помощником 17.11.2026). После запуска панели ни одной такой работы точно нет,
 * поэтому все отметки сбрасываются. Стоит в списке первым — до того, как другие поставщики сами
 * начнут что-то устанавливать.
 */
export default class StaleInstallStatusProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() !== 'web') return
    try {
      const Service = (await import('#models/service')).default
      const stuck = await Service.query().where('installation_status', 'installing')
      for (const service of stuck) {
        service.installation_status = 'idle'
        await service.save()
        logger.info(`[StaleInstallStatus] ${service.service_name}: установка/обновление оборвались при перезапуске — отметка снята`)
      }
    } catch (err: any) {
      logger.warn(`[StaleInstallStatus] не удалось проверить зависшие установки: ${err?.message ?? err}`)
    }
  }
}

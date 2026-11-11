import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Кладезъ: после запуска прочитать указатели поиска по карте заранее, в фоне.
 * Иначе первая подсказка после включения компьютера ждёт 20–40 секунд (файлы на диске D:
 * за мостом WSL читаются вразнобой мелкими кусками).
 */
export default class MapSearchWarmupProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    setTimeout(async () => {
      try {
        const { MapSearchService } = await import('#services/map_search_service')
        await MapSearchService.warmUp()
      } catch {}
    }, 2000)
  }
}

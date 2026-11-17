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
        // Наборам дорог, поставленным до 0.1.26, — их размер для «Управления картами» (один раз).
        const { MapRouteService } = await import('#services/map_route_service')
        const { backfillPackBytes } = await import('../app/utils/route_packs.js')
        await backfillPackBytes(MapRouteService.tilesDir(), MapRouteService.packsDir())
      } catch {}
    }, 2000)
  }
}

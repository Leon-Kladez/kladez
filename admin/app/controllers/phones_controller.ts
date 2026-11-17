import type { HttpContext } from '@adonisjs/core/http'
import KVStore from '#models/kv_store'
import { phoneUrl, qrPath, readLanAddresses } from '../utils/lan_addresses.js'
import { resolveDeviceAccess } from '#middleware/phone_access_middleware'
import { PhoneAppsService } from '#services/phone_apps_service'

/** Где телефон берёт приложение «Карты в дорогу» (Organic Maps) с этого компьютера. */
export const TRAVEL_MAPS_PATH = '/phone-apps/organic-maps.apk'

/** «Кладезъ»: «Открыть на телефоне» — адреса компьютера в домашней сети и QR-коды к ним. */
export default class PhonesController {
  async settings({ inertia }: HttpContext) {
    return inertia.render('settings/phones', {
      allowChanges: (await KVStore.getValue('phones.allowChanges')) === true,
    })
  }

  async info(ctx: HttpContext) {
    const device = await resolveDeviceAccess(ctx)
    const { addresses, port } = await readLanAddresses()
    return {
      device,
      allowChanges: (await KVStore.getValue('phones.allowChanges')) === true,
      // Для проверки на ВМ: с какого адреса панель видит этот запрос.
      seenFrom: ctx.request.request.socket?.remoteAddress ?? null,
      addresses: addresses.map((a) => {
        const url = phoneUrl(a.ip, port)
        return { ...a, url, qr: qrPath(url) }
      }),
    }
  }

  /** «Карты в дорогу»: готово ли приложение и QR-коды со ссылкой на него для каждого адреса. */
  async travelMaps() {
    const status = await PhoneAppsService.status()
    const { addresses, port } = await readLanAddresses()
    return {
      ...status,
      path: TRAVEL_MAPS_PATH,
      addresses: status.app
        ? addresses.map((a) => {
            const url = phoneUrl(a.ip, port) + TRAVEL_MAPS_PATH
            return { ...a, url, qr: qrPath(url) }
          })
        : [],
    }
  }

  /** Скачать приложение (только с компьютера — запросы с телефонов «только чтение»). */
  async travelMapsDownload() {
    return { started: PhoneAppsService.start() }
  }

  /** Сам файл .apk — телефону в домашней сети. */
  async travelMapsApk({ response }: HttpContext) {
    if (!(await PhoneAppsService.meta())) return response.notFound('Приложение ещё не подготовлено на компьютере.')
    response.header('Content-Type', 'application/vnd.android.package-archive')
    return response.attachment(PhoneAppsService.apkPath(), 'OrganicMaps.apk')
  }
}

import { usePage } from '@inertiajs/react'

export type DeviceAccess = { isComputer: boolean; canChange: boolean }

/**
 * «Кладезъ»: открыта ли панель на самом компьютере и можно ли отсюда что-то менять.
 * Решает сервер (phone_access_middleware); здесь — только чтобы спрятать лишние кнопки.
 */
export function useDevice(): DeviceAccess {
  const { device } = usePage<{ device?: DeviceAccess }>().props
  return device ?? { isComputer: true, canChange: true }
}

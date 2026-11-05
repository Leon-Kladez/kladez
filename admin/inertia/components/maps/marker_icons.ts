import {
  IconAlertTriangle,
  IconAmbulance,
  IconAntenna,
  IconBandage,
  IconBarrel,
  IconBattery,
  IconBed,
  IconBolt,
  IconBuildingHospital,
  IconCampfire,
  IconCar,
  IconDoor,
  IconDroplet,
  IconFirstAidKit,
  IconFish,
  IconFlag,
  IconGasStation,
  IconHome,
  IconMapPinFilled,
  IconMeat,
  IconMountain,
  IconPackage,
  IconPill,
  IconRadio,
  IconRoute,
  IconSeeding,
  IconSkull,
  IconSolarPanel,
  IconStethoscope,
  IconTent,
  IconTool,
  IconToolsKitchen2,
  IconTractor,
  IconTrees,
  IconTruck,
  IconWheat,
  IconWifi,
} from '@tabler/icons-react'
import type { IconProps } from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { t } from '../../../constants/i18n'

/**
 * The marker icon set: a curated 36, laid out as six rows of six.
 *
 * Deliberately named imports rather than `import * as TablerIcons`. The
 * namespace form pulls the entire icon library into the maps bundle -- when this
 * picker offered all of Tabler *and* all of Font Awesome it took the maps chunk
 * from 864 kB to 5,774 kB, and gave the user 160 pages to scroll through,
 * including brand logos and text-alignment glyphs. Neither is what someone
 * marking a water source needs.
 *
 * Adding an icon means adding it here, which is the point: the list stays
 * meaningful for marking a place on a map you are relying on offline.
 */
export type MarkerIconEntry = {
  /** Stored on the marker row, e.g. `tabler:IconDroplet`. */
  name: string
  /** Shown as the button tooltip. */
  label: string
  Icon: ComponentType<IconProps>
}

const entry = (
  Icon: ComponentType<IconProps>,
  tablerName: string,
  label: string
): MarkerIconEntry => ({ name: `tabler:${tablerName}`, label, Icon })

export const MARKER_ICONS: MarkerIconEntry[] = [
  // Water and food
  entry(IconDroplet, 'IconDroplet', t('pins.icon.droplet')),
  entry(IconBarrel, 'IconBarrel', t('pins.icon.barrel')),
  entry(IconToolsKitchen2, 'IconToolsKitchen2', t('pins.icon.toolsKitchen2')),
  entry(IconWheat, 'IconWheat', t('pins.icon.wheat')),
  entry(IconMeat, 'IconMeat', t('pins.icon.meat')),
  entry(IconFish, 'IconFish', t('pins.icon.fish')),

  // Shelter and living
  entry(IconHome, 'IconHome', t('pins.icon.home')),
  entry(IconTent, 'IconTent', t('pins.icon.tent')),
  entry(IconBed, 'IconBed', t('pins.icon.bed')),
  entry(IconDoor, 'IconDoor', t('pins.icon.door')),
  entry(IconCampfire, 'IconCampfire', t('pins.icon.campfire')),
  entry(IconSeeding, 'IconSeeding', t('pins.icon.seeding')),

  // Medical
  entry(IconFirstAidKit, 'IconFirstAidKit', t('pins.icon.firstAidKit')),
  entry(IconBuildingHospital, 'IconBuildingHospital', t('pins.icon.buildingHospital')),
  entry(IconStethoscope, 'IconStethoscope', t('pins.icon.stethoscope')),
  entry(IconPill, 'IconPill', t('pins.icon.pill')),
  entry(IconBandage, 'IconBandage', t('pins.icon.bandage')),
  entry(IconAmbulance, 'IconAmbulance', t('pins.icon.ambulance')),

  // Power and communications
  entry(IconBolt, 'IconBolt', t('pins.icon.bolt')),
  entry(IconSolarPanel, 'IconSolarPanel', t('pins.icon.solarPanel')),
  entry(IconBattery, 'IconBattery', t('pins.icon.battery')),
  entry(IconAntenna, 'IconAntenna', t('pins.icon.antenna')),
  entry(IconRadio, 'IconRadio', t('pins.icon.radio')),
  entry(IconWifi, 'IconWifi', t('pins.icon.wifi')),

  // Transport and supply
  entry(IconGasStation, 'IconGasStation', t('pins.icon.gasStation')),
  entry(IconCar, 'IconCar', t('pins.icon.car')),
  entry(IconTruck, 'IconTruck', t('pins.icon.truck')),
  entry(IconTractor, 'IconTractor', t('pins.icon.tractor')),
  entry(IconPackage, 'IconPackage', t('pins.icon.package')),
  entry(IconTool, 'IconTool', t('pins.icon.tool')),

  // Terrain, routes and hazards
  entry(IconMountain, 'IconMountain', t('pins.icon.mountain')),
  entry(IconTrees, 'IconTrees', t('pins.icon.trees')),
  entry(IconRoute, 'IconRoute', t('pins.icon.route')),
  entry(IconFlag, 'IconFlag', t('pins.icon.flag')),
  entry(IconAlertTriangle, 'IconAlertTriangle', t('pins.icon.alertTriangle')),
  entry(IconSkull, 'IconSkull', t('pins.icon.skull')),
]

/** The pin used when a marker has no icon, or names one no longer in the set. */
export const DEFAULT_MARKER_ICON = IconMapPinFilled

const BY_NAME = new Map(MARKER_ICONS.map((i) => [i.name, i.Icon]))

/**
 * Resolve a stored icon name to a component, falling back to the default pin.
 *
 * The fallback matters beyond bad data: a marker saved with an icon that is
 * later removed from the set must still render, rather than blanking the pin.
 */
export function resolveMarkerIcon(
  icon?: string | null,
  fallback: ComponentType<IconProps> = DEFAULT_MARKER_ICON
): ComponentType<IconProps> {
  if (!icon) return fallback
  return BY_NAME.get(icon) ?? fallback
}

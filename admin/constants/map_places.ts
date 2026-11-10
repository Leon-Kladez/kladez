// Кладезъ: места на карте — какие показываем своими значками и как они называются.
// Общий для сервера (оформление карты, app/utils/map_style.ts) и интерфейса (значки и подсказка).
// «kind» — вид места в данных карты (Protomaps, из OpenStreetMap).

import type { Locale } from './i18n/index.js'

export type PlaceGroup = {
  /** Имя значка на карте: kz-<id>. */
  id: string
  kinds: string[]
  /** Значок Tabler (outline) — рисуется в inertia/components/maps/place_icons.ts. */
  icon: string
  color: string
  /** Видно и при отдалении (до 15-го масштаба): то, что ищут первым. */
  early?: boolean
}

/** Важное, чего не было в оформлении карты: медицина, помощь, транспорт, деньги, ночлег. */
export const PLACE_GROUPS: PlaceGroup[] = [
  { id: 'pharmacy', kinds: ['pharmacy', 'chemist'], icon: 'pill', color: '#c62828' },
  { id: 'hospital', kinds: ['hospital'], icon: 'building-hospital', color: '#c62828', early: true },
  { id: 'clinic', kinds: ['clinic', 'doctors', 'clinic;doctors'], icon: 'stethoscope', color: '#c62828' },
  { id: 'dentist', kinds: ['dentist'], icon: 'dental', color: '#c62828' },
  { id: 'veterinary', kinds: ['veterinary'], icon: 'paw', color: '#8d5a2b' },
  { id: 'police', kinds: ['police'], icon: 'shield', color: '#1f4fa3', early: true },
  { id: 'fire', kinds: ['fire_station'], icon: 'flame', color: '#d84315', early: true },
  { id: 'rescue', kinds: ['rescue_station'], icon: 'lifebuoy', color: '#d84315', early: true },
  { id: 'shelter', kinds: ['shelter'], icon: 'home-shield', color: '#5d4037' },
  { id: 'metro', kinds: ['subway_entrance'], icon: 'letter-m', color: '#d32f2f', early: true },
  { id: 'tram', kinds: ['tram_stop'], icon: 'train', color: '#315bcf' },
  { id: 'fuel', kinds: ['fuel'], icon: 'gas-station', color: '#37474f', early: true },
  { id: 'charging', kinds: ['charging_station'], icon: 'charging-pile', color: '#2e7d32' },
  { id: 'bank', kinds: ['bank'], icon: 'building-bank', color: '#2e7d4f' },
  { id: 'atm', kinds: ['atm', 'bureau_de_change'], icon: 'cash', color: '#2e7d4f' },
  { id: 'worship', kinds: ['place_of_worship', 'monastery'], icon: 'building-church', color: '#6d4c41' },
  { id: 'hotel', kinds: ['hotel', 'hostel', 'guest_house', 'motel'], icon: 'bed', color: '#7b1fa2' },
  { id: 'kindergarten', kinds: ['kindergarten', 'childcare'], icon: 'baby-carriage', color: '#ef6c00' },
  { id: 'market', kinds: ['marketplace', 'mall', 'department_store'], icon: 'building-store', color: '#1a8cbd' },
  { id: 'parking', kinds: ['parking'], icon: 'parking', color: '#1565c0' },
  { id: 'phone', kinds: ['telephone'], icon: 'phone', color: '#455a64' },
]

/** Префикс имён наших значков: их рисует карта сама (styleimagemissing), спрайт не меняется. */
export const PLACE_ICON_PREFIX = 'kz-'

export function placeGroupForKind(kind: unknown): PlaceGroup | null {
  if (typeof kind !== 'string') return null
  return PLACE_GROUPS.find((g) => g.kinds.includes(kind)) ?? null
}

/** Название вида места для подсказки: [русский, английский]. */
const KIND_NAMES: Record<string, [string, string]> = {
  pharmacy: ['Аптека', 'Pharmacy'],
  chemist: ['Аптека, бытовая химия', 'Chemist'],
  hospital: ['Больница', 'Hospital'],
  clinic: ['Поликлиника', 'Clinic'],
  doctors: ['Врач', 'Doctor'],
  'clinic;doctors': ['Поликлиника', 'Clinic'],
  dentist: ['Стоматология', 'Dentist'],
  veterinary: ['Ветеринарная клиника', 'Veterinary'],
  medical_supply: ['Медтехника', 'Medical supply'],
  optician: ['Оптика', 'Optician'],
  police: ['Полиция', 'Police'],
  fire_station: ['Пожарная часть', 'Fire station'],
  rescue_station: ['Спасательная станция', 'Rescue station'],
  shelter: ['Укрытие', 'Shelter'],
  subway_entrance: ['Вход в метро', 'Metro entrance'],
  tram_stop: ['Трамвайная остановка', 'Tram stop'],
  bus_stop: ['Остановка', 'Bus stop'],
  station: ['Станция', 'Station'],
  ferry_terminal: ['Причал', 'Ferry terminal'],
  aerodrome: ['Аэропорт', 'Airport'],
  taxi: ['Стоянка такси', 'Taxi'],
  fuel: ['Заправка', 'Fuel station'],
  charging_station: ['Зарядка для электромобилей', 'Charging station'],
  parking: ['Парковка', 'Parking'],
  car_repair: ['Автосервис', 'Car repair'],
  bank: ['Банк', 'Bank'],
  atm: ['Банкомат', 'ATM'],
  bureau_de_change: ['Обмен валюты', 'Currency exchange'],
  post_office: ['Почта', 'Post office'],
  parcel_locker: ['Постамат', 'Parcel locker'],
  place_of_worship: ['Храм', 'Place of worship'],
  monastery: ['Монастырь', 'Monastery'],
  hotel: ['Гостиница', 'Hotel'],
  hostel: ['Хостел', 'Hostel'],
  guest_house: ['Гостевой дом', 'Guest house'],
  motel: ['Мотель', 'Motel'],
  kindergarten: ['Детский сад', 'Kindergarten'],
  childcare: ['Присмотр за детьми', 'Childcare'],
  school: ['Школа', 'School'],
  university: ['Университет', 'University'],
  college: ['Колледж', 'College'],
  library: ['Библиотека', 'Library'],
  marketplace: ['Рынок', 'Market'],
  mall: ['Торговый центр', 'Shopping mall'],
  department_store: ['Универмаг', 'Department store'],
  supermarket: ['Супермаркет', 'Supermarket'],
  convenience: ['Продуктовый магазин', 'Grocery'],
  bakery: ['Пекарня', 'Bakery'],
  butcher: ['Мясной магазин', 'Butcher'],
  greengrocer: ['Овощи и фрукты', 'Greengrocer'],
  alcohol: ['Алкоголь', 'Liquor store'],
  hardware: ['Хозяйственный магазин', 'Hardware store'],
  doityourself: ['Строительный магазин', 'DIY store'],
  clothes: ['Одежда', 'Clothes'],
  shoes: ['Обувь', 'Shoes'],
  books: ['Книжный магазин', 'Bookshop'],
  electronics: ['Электроника', 'Electronics'],
  mobile_phone: ['Салон связи', 'Mobile phones'],
  florist: ['Цветы', 'Florist'],
  beauty: ['Салон красоты', 'Beauty salon'],
  hairdresser: ['Парикмахерская', 'Hairdresser'],
  laundry: ['Прачечная', 'Laundry'],
  dry_cleaning: ['Химчистка', 'Dry cleaning'],
  cafe: ['Кафе', 'Cafe'],
  restaurant: ['Ресторан', 'Restaurant'],
  fast_food: ['Быстрое питание', 'Fast food'],
  bar: ['Бар', 'Bar'],
  pub: ['Паб', 'Pub'],
  food_court: ['Фуд-корт', 'Food court'],
  toilets: ['Туалет', 'Toilets'],
  drinking_water: ['Питьевая вода', 'Drinking water'],
  water_point: ['Питьевая вода', 'Water point'],
  telephone: ['Телефон', 'Telephone'],
  museum: ['Музей', 'Museum'],
  theatre: ['Театр', 'Theatre'],
  cinema: ['Кинотеатр', 'Cinema'],
  gallery: ['Галерея', 'Gallery'],
  attraction: ['Достопримечательность', 'Attraction'],
  artwork: ['Произведение искусства', 'Artwork'],
  memorial: ['Памятник', 'Memorial'],
  monument: ['Памятник', 'Monument'],
  viewpoint: ['Смотровая площадка', 'Viewpoint'],
  park: ['Парк', 'Park'],
  garden: ['Сад', 'Garden'],
  zoo: ['Зоопарк', 'Zoo'],
  playground: ['Детская площадка', 'Playground'],
  stadium: ['Стадион', 'Stadium'],
  sports_centre: ['Спортивный центр', 'Sports centre'],
  fitness_centre: ['Фитнес', 'Fitness'],
  townhall: ['Администрация', 'Town hall'],
  courthouse: ['Суд', 'Courthouse'],
  community_centre: ['Дом культуры', 'Community centre'],
  social_facility: ['Социальная служба', 'Social facility'],
  information: ['Справочная', 'Information'],
  beach: ['Пляж', 'Beach'],
  peak: ['Вершина', 'Peak'],
  forest: ['Лес', 'Forest'],
  marina: ['Пристань', 'Marina'],
  cemetery: ['Кладбище', 'Cemetery'],
  // Поиск по карте: населённые пункты, улицы, дома.
  city: ['Город', 'City'],
  town: ['Город', 'Town'],
  village: ['Село', 'Village'],
  hamlet: ['Деревня', 'Hamlet'],
  isolated_dwelling: ['Хутор', 'Farmstead'],
  suburb: ['Район', 'District'],
  borough: ['Район', 'Borough'],
  quarter: ['Квартал', 'Quarter'],
  neighbourhood: ['Микрорайон', 'Neighbourhood'],
  locality: ['Урочище', 'Locality'],
  square: ['Площадь', 'Square'],
  street: ['Улица', 'Street'],
  house: ['Дом', 'House'],
  building: ['Здание', 'Building'],
  metro: ['Станция метро', 'Metro station'],
  bus_station: ['Автовокзал', 'Bus station'],
  ambulance_station: ['Скорая помощь', 'Ambulance station'],
  defibrillator: ['Дефибриллятор', 'Defibrillator'],
  canteen: ['Столовая', 'Canteen'],
  outpost: ['Пункт выдачи заказов', 'Parcel pickup point'],
  company: ['Организация', 'Company'],
  copyshop: ['Копицентр', 'Copy shop'],
  houseware: ['Товары для дома', 'Houseware'],
  government: ['Госучреждение', 'Government office'],
  pet: ['Зоомагазин', 'Pet shop'],
  jewelry: ['Ювелирный магазин', 'Jewellery'],
  gift: ['Подарки', 'Gifts'],
  cosmetics: ['Косметика', 'Cosmetics'],
  furniture: ['Мебель', 'Furniture'],
  car: ['Автосалон', 'Car dealer'],
  car_parts: ['Автозапчасти', 'Car parts'],
  tobacco: ['Табак', 'Tobacco'],
  confectionery: ['Кондитерская', 'Confectionery'],
  tailor: ['Ателье', 'Tailor'],
  shoe_repair: ['Ремонт обуви', 'Shoe repair'],
  hairdresser_supply: ['Товары для парикмахеров', 'Hairdresser supply'],
  travel_agency: ['Турагентство', 'Travel agency'],
  vending_machine: ['Автомат', 'Vending machine'],
  kiosk: ['Киоск', 'Kiosk'],
  swimming_pool: ['Бассейн', 'Swimming pool'],
  car_wash: ['Автомойка', 'Car wash'],
}

export function placeKindName(kind: unknown, locale: Locale): string | null {
  if (typeof kind !== 'string') return null
  const names = KIND_NAMES[kind]
  if (!names) return null
  return locale === 'en' ? names[1] : names[0]
}

/** «7/10 ст1» → «7/10 стр. 1»: сокращения из данных — понятнее. */
export function formatHouseNumber(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const s = String(raw).trim()
  if (!s) return null
  return s
    .replace(/\s*(?:ст|стр|с)\.?\s*(\d)/giu, ' стр. $1')
    .replace(/\s*к\.?\s*(\d)/giu, ' корп. $1')
    .replace(/^вл\.?\s*/iu, 'вл. ')
}

import type { tierEn } from '../en/tier.js'

export const tierRu: Record<keyof typeof tierEn, string> = {
  'tier.intro': 'Выберите уровень по свободному месту и своим нуждам. Старший уровень включает всё из младших.',
  'tier.includes': '(включает «{name}»)',
  'tier.additionalResources': 'ещё {count} материал|ещё {count} материала|ещё {count} материалов',
  'tier.plusEverything': ' (и всё из «{name}»)',
  'tier.resourcesIncluded': '{count} материал|{count} материала|{count} материалов',
  'tier.embedEstimate': '{size} места понадобится дополнительно, если подготовить эти материалы для ИИ-помощника',
  'tier.estimateExcludes': ' (без учёта некоторых файлов — по ним пока нет данных)',
  'tier.autoIndex': 'Автоподготовка для ИИ',
  'tier.always': 'Всегда',
  'tier.autoIndexAlways': 'Настройка «{setting}» — {value}, поэтому файлы подготовятся сами после скачивания. Изменить это можно в настройках базы знаний.',
  'tier.autoIndexManual': 'Настройка «{setting}» — {value}, поэтому файлы не будут подготовлены, пока вы не включите это в настройках базы знаний.',
  'tier.changeAnyTime': 'Выбор можно изменить в любое время. Нажмите «Готово», чтобы подтвердить.',
}

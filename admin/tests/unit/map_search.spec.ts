// Внимание: на Windows под загрузчиком ts-node процесс с node:sqlite может упасть уже ПОСЛЕ
// прохождения всех проверок (код 139 при выходе). Это особенность загрузчика: тот же тест,
// собранный в JS, и в контейнере Кладезя (Linux, Node 22) проходит чисто.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'

import { ftsQuery, houseMatches, normalizeHouse, parseSearch, scoreResult } from '../../app/utils/map_search_query.js'
import { parseCoordinatesInput, searchZoom } from '../../inertia/lib/map_search_ui.js'
import { MapSearchService, newestPerRegion } from '../../app/services/map_search_service.js'

test('разбор запроса: улица и дом', () => {
  assert.deepEqual(parseSearch('Пятницкая 7'), { words: ['пятницкая'], house: '7' })
  assert.deepEqual(parseSearch('Пятницкая 7 с2'), { words: ['пятницкая'], house: '7с2' })
  assert.deepEqual(parseSearch('пятницкая 7 к 1'), { words: ['пятницкая'], house: '7к1' })
  assert.deepEqual(parseSearch('москва, ул. Ленина, д. 5'), { words: ['москва', 'ленина'], house: '5' })
  assert.deepEqual(parseSearch('Ленина 12а'), { words: ['ленина'], house: '12а' })
  assert.deepEqual(parseSearch('Ленина 3/1'), { words: ['ленина'], house: '3/1' })
})

test('разбор запроса: без дома', () => {
  assert.deepEqual(parseSearch('аптека'), { words: ['аптека'], house: null })
  assert.deepEqual(parseSearch('Ёлкино'), { words: ['елкино'], house: null })
  assert.deepEqual(parseSearch('1-я Парковая'), { words: ['1-я', 'парковая'], house: null })
  // Одно стоп-слово не выбрасываем: «Набережная» — тоже улица.
  assert.deepEqual(parseSearch('набережная'), { words: ['набережная'], house: null })
  // Только число — ищем как слово.
  assert.deepEqual(parseSearch('1812'), { words: ['1812'], house: null })
})

test('запрос FTS: по началу слова, кавычки не ломают', () => {
  assert.equal(ftsQuery(['пятн', 'москва']), '"пятн"* "москва"*')
  assert.equal(ftsQuery(['a"b']), '"ab"*')
  assert.equal(ftsQuery(['м']), '"м"')
  assert.equal(ftsQuery([]), null)
})

test('номера домов', () => {
  assert.equal(normalizeHouse('7 с2'), '7с2')
  assert.equal(normalizeHouse('7 стр. 2'), '7с2')
  assert.equal(normalizeHouse('5 корп. 1'), '5к1')
  assert.equal(normalizeHouse('д. 9'), '9')
  assert.equal(houseMatches('7', '7'), 'exact')
  assert.equal(houseMatches('7', '7 к1'), 'prefix')
  assert.equal(houseMatches('7', '70'), null)
  assert.equal(houseMatches('7с2', '7 стр. 2'), 'exact')
})

test('порядок: точное название и близость выше', () => {
  const near = scoreResult({ rank: 40, name: 'Пятницкая улица', words: ['пятницкая'], distanceKm: 1 })
  const far = scoreResult({ rank: 40, name: 'Пятницкая улица', words: ['пятницкая'], distanceKm: 500 })
  assert.ok(near > far)
  const exact = scoreResult({ rank: 85, name: 'Тула', words: ['тула'], distanceKm: null })
  const partial = scoreResult({ rank: 85, name: 'Тулун', words: ['тула'], distanceKm: null })
  assert.ok(exact > partial)
})

test('координаты в строке поиска', () => {
  assert.deepEqual(parseCoordinatesInput('55.75, 37.62'), { lat: 55.75, lng: 37.62 })
  assert.deepEqual(parseCoordinatesInput('55.75 37.62'), { lat: 55.75, lng: 37.62 })
  assert.deepEqual(parseCoordinatesInput('55,75 37,62'), { lat: 55.75, lng: 37.62 })
  assert.deepEqual(parseCoordinatesInput('-33.9, 18.4'), { lat: -33.9, lng: 18.4 })
  assert.equal(parseCoordinatesInput('пятницкая 7'), null)
  assert.equal(parseCoordinatesInput('95, 10'), null)
  assert.equal(searchZoom('place', 'city'), 11)
  assert.equal(searchZoom('house', 'house'), 17.5)
})

test('самый новый указатель на регион', () => {
  const m = newestPerRegion(['search-ru-central_2026-08.sqlite', 'search-ru-central_2026-11.sqlite', 'x.txt', 'search-ru-south_2026-11.sqlite'])
  assert.equal(m.get('ru-central'), 'search-ru-central_2026-11.sqlite')
  assert.equal(m.size, 2)
})

/** Маленький указатель той же схемы, что пишет kladez-maps/tools/search-build/build_index.py. */
function makeIndex(dir: string) {
  const db = new DatabaseSync(join(dir, 'search-ru-test_2026-11.sqlite'))
  db.exec(`
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE items(id INTEGER PRIMARY KEY, cls TEXT NOT NULL, kind TEXT, name TEXT NOT NULL, name_en TEXT,
      city TEXT, street TEXT, house TEXT, lat REAL NOT NULL, lon REAL NOT NULL, rank INTEGER NOT NULL);
    CREATE VIRTUAL TABLE items_fts USING fts5(name, name_en, words, city, content='', tokenize='unicode61 remove_diacritics 2', prefix='2 3');
    CREATE TABLE houses(street_id INTEGER NOT NULL, house TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL);
    INSERT INTO meta VALUES ('schema', '1');
  `)
  const item = db.prepare('INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  const fts = db.prepare('INSERT INTO items_fts(rowid, name, name_en, words, city) VALUES (?,?,?,?,?)')
  const rows: [number, string, string, string, string | null, string | null, string | null, string | null, number, number, number, string][] = [
    [1, 'place', 'city', 'Москва', 'Moscow', null, null, null, 55.7558, 37.6173, 100, 'город'],
    // Тот же город границей — середина в 5 км от центра: в выдаче один раз.
    [7, 'place', 'city', 'Москва', null, null, null, null, 55.71, 37.62, 100, 'город'],
    [8, 'poi', 'pharmacy', 'Аптека', null, 'Ивановка', null, null, 55.34, 37.0, 45, 'аптека pharmacy'],
    [2, 'street', 'street', 'Пятницкая улица', 'Pyatnitskaya Street', 'Москва', null, null, 55.742, 37.628, 40, ''],
    [3, 'street', 'street', 'Пятницкая улица', null, 'Ивановка', null, null, 55.30, 37.00, 40, ''],
    [4, 'poi', 'pharmacy', 'Ригла', null, 'Москва', 'Пятницкая улица', '7', 55.7441, 37.6276, 45, 'аптека pharmacy'],
    [5, 'poi', 'pharmacy', '', null, 'Ивановка', null, null, 55.3003, 37.0004, 15, 'аптека pharmacy'],
    [6, 'poi', 'school', 'Школа № 5', null, 'Москва', null, null, 55.75, 37.61, 40, 'школа school'],
  ]
  for (const r of rows) {
    item.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10])
    fts.run(r[0], r[3], r[4] ?? '', r[11], r[5] ?? '')
  }
  // Сотни мест «в Москве» (совпадают по полю город) — сам город не должен из-за них пропасть.
  for (let k = 0; k < 400; k++) {
    item.run(100 + k, 'poi', 'cafe', `Кафе ${k}`, null, 'Москва', null, null, 55.75, 37.6, 30)
    fts.run(100 + k, `Кафе ${k}`, '', 'кафе cafe', 'Москва')
  }
  const house = db.prepare('INSERT INTO houses VALUES (?,?,?,?)')
  house.run(2, '7', 55.7441, 37.6277)
  house.run(2, '7 с2', 55.7440, 37.6276)
  house.run(2, '70', 55.7400, 37.6280)
  house.run(3, '7', 55.3011, 37.0011)
  db.close()
}

test('поиск по указателю: улица с домом, места, близость, адрес по точке', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-search-'))
  const cwd = process.cwd()
  try {
    // Сервис ищет в <cwd>/storage/maps/search.
    const root = join(dir, 'root')
    const searchDir = join(root, 'storage', 'maps', 'search')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(searchDir, { recursive: true })
    makeIndex(searchDir)
    process.chdir(root)

    // Около Москвы: «Пятницкая 7» — дом 7 на московской Пятницкой первым, потом 7 с2; не 70.
    const r = await MapSearchService.search('Пятницкая 7', { lat: 55.75, lon: 37.62 })
    assert.equal(r[0].cls, 'house')
    assert.equal(r[0].name, 'Пятницкая улица, 7')
    assert.equal(r[0].city, 'Москва')
    assert.ok(r.some((x) => x.name === 'Пятницкая улица, 7 с2'))
    assert.ok(!r.some((x) => x.name.endsWith(', 70')))

    // Около Ивановки та же улица — сначала своя.
    const v = await MapSearchService.search('пятницкая', { lat: 55.3, lon: 37.0 })
    assert.equal(v[0].city, 'Ивановка')

    // По виду места: ближайшая аптека первой — даже если у дальней название ровно «Аптека».
    const a = await MapSearchService.search('аптека', { lat: 55.3, lon: 37.0 })
    assert.equal(a.length, 3)
    assert.equal(a[0].name, '')
    assert.equal(a[1].name, 'Аптека')
    assert.equal(a[2].name, 'Ригла')
    assert.equal(a[2].address, 'Пятницкая улица, 7')

    // «школа 5» — и как «Школа № 5».
    const s = await MapSearchService.search('школа 5')
    assert.ok(s.some((x) => x.name === 'Школа № 5'))

    // Город первым, хотя сотни мест «в Москве» тоже подходят.
    const m = await MapSearchService.search('Москва', { lat: 43.0, lon: 45.0 })
    assert.equal(m[0].cls, 'place')
    assert.equal(m[0].name, 'Москва')
    assert.equal(m.filter((x) => x.cls === 'place' && x.name === 'Москва').length, 1)

    // Английский интерфейс — английское название, где есть.
    const e = await MapSearchService.search('moscow', { english: true })
    assert.equal(e[0].name, 'Moscow')

    assert.deepEqual(await MapSearchService.addressAt(55.74401, 37.62761), {
      street: 'Пятницкая улица',
      house: '7 с2',
      city: 'Москва',
    })
    assert.equal(await MapSearchService.addressAt(56.5, 38.5), null)
    assert.deepEqual(await MapSearchService.available(), ['ru-test'])
  } finally {
    MapSearchService.closeAll()
    process.chdir(cwd)
    rmSync(dir, { recursive: true, force: true })
  }
})

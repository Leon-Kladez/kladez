import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { errorText } from '../../inertia/lib/error_text.js'

// Всплывающие ошибки не должны смешивать языки: «Произошла ошибка. Request failed with status code 500».

test('русское сообщение сервера показывается как есть', () => {
  const err = { message: 'Request failed with status code 422', response: { data: { message: 'Настройка сохранена' } } }
  assert.equal(errorText(err, 'Запасной текст'), 'Настройка сохранена')
})

test('поле error в ответе сервера тоже используется', () => {
  const err = { message: 'Request failed with status code 404', response: { data: { error: 'Ссылка не найдена' } } }
  assert.equal(errorText(err, 'Запасной текст'), 'Ссылка не найдена')
})

test('сетевая ошибка без ответа — понятный текст про интернет', () => {
  assert.match(errorText({ message: 'Network Error' }, 'Запасной текст'), /интернет/)
})

test('непонятный английский текст заменяется запасным русским', () => {
  assert.equal(errorText(new Error('Unexpected token < in JSON'), 'Не удалось сохранить'), 'Не удалось сохранить')
  assert.equal(errorText(undefined, 'Не удалось сохранить'), 'Не удалось сохранить')
})

test('код ответа сервера без русского текста — переводится', () => {
  assert.match(errorText({ message: 'Request failed with status code 500' }, 'Запасной'), /500/)
})

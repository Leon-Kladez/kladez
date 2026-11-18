import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addQuote, quoteText, splitQuotes } from '../../inertia/lib/quote.js'

test('выделенное становится цитатой Markdown', () => {
  assert.equal(quoteText('  Действенные шаги: как сообщить?  '), '> Действенные шаги: как сообщить?\n\n')
  assert.equal(quoteText('\nпервая\n\nвторая\n'), '> первая\n>\n> вторая\n\n')
  assert.equal(quoteText('   \n  '), '')
})

test('цитата встаёт перед уже набранным текстом', () => {
  assert.equal(addQuote('', 'кусок'), '> кусок\n\n')
  assert.equal(addQuote('  мой вопрос', 'кусок'), '> кусок\n\nмой вопрос')
  assert.equal(addQuote('мой вопрос', '  '), 'мой вопрос')
})

test('вопрос делится на цитату и текст', () => {
  assert.deepEqual(splitQuotes('> строка 1\n> строка 2\n\nА это как?'), [
    { quote: true, text: 'строка 1\nстрока 2' },
    { quote: false, text: 'А это как?' },
  ])
  assert.deepEqual(splitQuotes('Просто вопрос'), [{ quote: false, text: 'Просто вопрос' }])
})

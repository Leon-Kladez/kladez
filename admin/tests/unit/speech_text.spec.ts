import { test } from 'node:test'
import assert from 'node:assert/strict'

import { cleanTranscript } from '../../app/utils/speech_text.js'
import { whisperStartScript, WHISPER_MODEL } from '../../constants/speech.js'

test('текст из Whisper: метки и лишние пробелы убираются', () => {
  assert.equal(cleanTranscript('  Привет,   как дела? [BLANK_AUDIO] '), 'Привет, как дела?')
  assert.equal(cleanTranscript('(музыка) Где ближайшая аптека?'), 'Где ближайшая аптека?')
})

test('фразы-призраки на тишине — пустая строка, а не текст', () => {
  assert.equal(cleanTranscript('Продолжение следует...'), '')
  assert.equal(cleanTranscript('Субтитры сделал DimaTorzok'), '')
  assert.equal(cleanTranscript('[BLANK_AUDIO]'), '')
  assert.equal(cleanTranscript(' Thank you for watching! '), '')
  assert.equal(cleanTranscript('Продолжение следует завтра в десять утра'), 'Продолжение следует завтра в десять утра')
})

test('скрипт запуска: модель, автоязык, перекодировка, не больше 4 потоков', () => {
  const s = whisperStartScript()
  assert.ok(s.startsWith('#!/bin/bash'))
  assert.ok(s.includes(`-m /models/${WHISPER_MODEL.filename}`))
  assert.ok(s.includes('-l auto'))
  assert.ok(s.includes('--convert'))
  assert.ok(s.includes('[ "$THREADS" -gt 4 ] && THREADS=4'))
  assert.ok(!s.includes('\r'), 'перевод строк — как в Linux')
})

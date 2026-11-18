import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RU_THINK_PREFIX, canSteerThinking, renderQwenPrompt } from '../../app/utils/russian_thinking.js'
import { ThinkTagSplitter } from '../../app/utils/think_stream.js'

const chat = [
  { role: 'system', content: 'Отвечай по-русски.' },
  { role: 'user', content: 'Привет' },
  { role: 'assistant', content: 'Здравствуйте!' },
  { role: 'user', content: 'Как дела?' },
]

test('рассуждение задаём только для Qwen 3 с включённым размышлением', () => {
  assert.equal(canSteerThinking('qwen3.5:4b', true, chat), true)
  assert.equal(canSteerThinking('qwen3:8b', true, chat), true)
  assert.equal(canSteerThinking('qwen3.5:4b', false, chat), false)
  assert.equal(canSteerThinking('qwen3.5:4b', 'medium', chat), false)
  assert.equal(canSteerThinking('deepseek-r1:7b', true, chat), false)
  assert.equal(canSteerThinking('gpt-oss:20b', true, chat), false)
  assert.equal(canSteerThinking('qwen2.5:7b', true, chat), false)
})

test('с картинкой или инструментами — обычный путь', () => {
  const withImage = [
    ...chat.slice(0, 3),
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Что на фото?' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
      ],
    },
  ]
  assert.equal(canSteerThinking('qwen3.5:4b', true, withImage), false)
  assert.equal(canSteerThinking('qwen3.5:4b', true, [...chat, { role: 'tool', content: '{}' }]), false)
  const textParts = [{ role: 'user', content: [{ type: 'text', text: 'Только текст' }] }]
  assert.equal(canSteerThinking('qwen3.5:4b', true, textParts), true)
})

test('разговор собирается в формат Qwen с открытым рассуждением', () => {
  const prompt = renderQwenPrompt(chat)
  assert.equal(
    prompt,
    '<|im_start|>system\nОтвечай по-русски.<|im_end|>\n' +
      '<|im_start|>user\nПривет<|im_end|>\n' +
      '<|im_start|>assistant\nЗдравствуйте!<|im_end|>\n' +
      '<|im_start|>user\nКак дела?<|im_end|>\n' +
      `<|im_start|>assistant\n<think>\n${RU_THINK_PREFIX}`
  )
})

test('продолжение модели делится на рассуждение и ответ', () => {
  const splitter = new ThinkTagSplitter()
  const first = splitter.push(`<think>${RU_THINK_PREFIX}`)
  assert.equal(first.thinking, RU_THINK_PREFIX)
  const a = splitter.push(' спрашивает, как дела.\n</th')
  const b = splitter.push('ink>\n\nВсё хорошо!')
  const tail = splitter.flush()
  assert.equal(first.thinking + a.thinking + b.thinking + tail.thinking, `${RU_THINK_PREFIX} спрашивает, как дела.\n`)
  assert.equal((a.content + b.content + tail.content).trimStart(), 'Всё хорошо!')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RU_THINK_PREFIX,
  SteeredThinkSplitter,
  canSteerThinking,
  renderSteeredPrompt,
  thinkingDialect,
} from '../../app/utils/russian_thinking.js'

const chat = [
  { role: 'system', content: 'Отвечай по-русски.' },
  { role: 'user', content: 'Привет' },
  { role: 'assistant', content: 'Здравствуйте!' },
  { role: 'user', content: 'Как дела?' },
]

test('рассуждение задаём для Qwen 3, DeepSeek-R1 и Gemma 4 с включённым размышлением', () => {
  for (const m of ['qwen3.5:4b', 'qwen3:8b', 'qwen3-vl:8b', 'deepseek-r1:32b', 'deepseek-r1:1.5b', 'gemma4:e4b', 'gemma4:31b']) {
    assert.equal(canSteerThinking(m, true, chat), true, m)
  }
  assert.equal(canSteerThinking('qwen3.5:4b', false, chat), false)
  assert.equal(canSteerThinking('gpt-oss:20b', 'medium', chat), false)
  assert.equal(canSteerThinking('gpt-oss:20b', true, chat), false)
  assert.equal(canSteerThinking('qwen2.5:7b', true, chat), false)
  assert.equal(canSteerThinking('gemma3:4b', true, chat), false)
  assert.equal(thinkingDialect('hf.co/someone/qwen3-8b-gguf')?.family, 'qwen3')
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
  assert.equal(canSteerThinking('gemma4:e4b', true, withImage), false)
  assert.equal(canSteerThinking('qwen3.5:4b', true, [...chat, { role: 'tool', content: '{}' }]), false)
  const textParts = [{ role: 'user', content: [{ type: 'text', text: 'Только текст' }] }]
  assert.equal(canSteerThinking('qwen3.5:4b', true, textParts), true)
})

test('Qwen: ChatML с открытым <think>', () => {
  assert.equal(
    renderSteeredPrompt('qwen3.5:4b', chat),
    '<|im_start|>system\nОтвечай по-русски.<|im_end|>\n' +
      '<|im_start|>user\nПривет<|im_end|>\n' +
      '<|im_start|>assistant\nЗдравствуйте!<|im_end|>\n' +
      '<|im_start|>user\nКак дела?<|im_end|>\n' +
      `<|im_start|>assistant\n<think>\n${RU_THINK_PREFIX}`
  )
})

test('DeepSeek-R1: указания в начале, реплики через <｜User｜>/<｜Assistant｜>', () => {
  assert.equal(
    renderSteeredPrompt('deepseek-r1:32b', chat),
    'Отвечай по-русски.' +
      '<｜User｜>Привет<｜Assistant｜>Здравствуйте!<｜end▁of▁sentence｜>' +
      `<｜User｜>Как дела?<｜Assistant｜><think>\n${RU_THINK_PREFIX}`
  )
})

test('Gemma 4: <|turn>, рассуждение включено <|think|> и открыто <|channel>thought', () => {
  const twoSystems = [{ role: 'system', content: 'Пиши markdown.' }, ...chat]
  assert.equal(
    renderSteeredPrompt('gemma4:e4b', twoSystems),
    '<bos><|turn>system\n<|think|>\nПиши markdown.\n\nОтвечай по-русски.<turn|>\n' +
      '<|turn>user\nПривет<turn|>\n' +
      '<|turn>model\nЗдравствуйте!<turn|>\n' +
      '<|turn>user\nКак дела?<turn|>\n' +
      `<|turn>model\n<|channel>thought\n${RU_THINK_PREFIX}`
  )
})

test('продолжение делится на рассуждение и ответ, метка может прийти по кускам', () => {
  const qwen = new SteeredThinkSplitter(thinkingDialect('qwen3.5:4b')!)
  const a = qwen.push(' спрашивает, как дела.\n</th')
  const b = qwen.push('ink>\n\nВсё хорошо!<|im_end|>')
  const t = qwen.flush()
  assert.equal(a.thinking + b.thinking + t.thinking, ' спрашивает, как дела.\n')
  assert.equal(a.content + b.content + t.content, 'Всё хорошо!')

  const gemma = new SteeredThinkSplitter(thinkingDialect('gemma4:e4b')!)
  const g1 = gemma.push(' просит совет.<chan')
  const g2 = gemma.push('nel|>Вот совет.')
  const g3 = gemma.push('<turn|>')
  assert.equal(g1.thinking + g2.thinking, ' просит совет.')
  assert.equal(g1.content + g2.content + g3.content + gemma.flush().content, 'Вот совет.')
})

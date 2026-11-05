import assert from 'node:assert/strict'
import test from 'node:test'
import { visionAttachmentGuidance } from '../../inertia/lib/vision_guidance.js'

test('vision guidance makes temporary image handling explicit', () => {
  const guidance = visionAttachmentGuidance('supported')

  assert.match(guidance, /только с этим сообщением/i)
  assert.match(guidance, /не сохраняются/i)
  assert.match(guidance, /обновления страницы/i)
})

test('unknown vision guidance explains the user choice without backend jargon', () => {
  const guidance = visionAttachmentGuidance('unknown')

  assert.match(guidance, /не может проверить/i)
  assert.match(guidance, /попробовать/i)
  assert.match(guidance, /не пройдёт/i)
  assert.doesNotMatch(guidance, /backend|metadata|projector/i)
})

test('unsupported vision guidance points users to a compatible model', () => {
  assert.match(visionAttachmentGuidance('unsupported'), /понимает картинки/i)
})

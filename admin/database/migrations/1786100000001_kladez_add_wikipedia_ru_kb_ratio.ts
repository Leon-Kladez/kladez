import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'

/**
 * Kladez: knowledge-base size heuristics for the Russian catalog. Upstream seeded
 * only `wikipedia_en_`; Russian Wikimedia ZIMs fell through to the generic
 * fallback. Same prose density as the English Wikipedia seed. Inserted only if
 * the pattern is missing, so self-calibrated rows are never overwritten.
 */
const ROWS = [
  { pattern: 'wikipedia_ru_', chunks_per_mb: 270, notes: 'Kladez seed: Russian Wikipedia variants' },
]

export default class extends BaseSchema {
  protected tableName = 'kb_ratio_registry'

  async up() {
    this.defer(async (db) => {
      const now = DateTime.utc().toSQL({ includeOffset: false }) as string
      for (const row of ROWS) {
        const existing = await db.from(this.tableName).where('pattern', row.pattern).first()
        if (!existing) {
          await db.table(this.tableName).insert({ ...row, created_at: now, updated_at: now })
        }
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereIn(
          'pattern',
          ROWS.map((r) => r.pattern)
        )
        .where('sample_count', 0)
        .delete()
    })
  }
}

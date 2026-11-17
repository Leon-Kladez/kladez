import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * «Кладезъ»: меню «⋮» у разговора — «Закрепить» (наверху списка) и «Отметить как
 * прочитанное / непрочитанное» (как в почте: вернуться к разговору позже).
 */
export default class extends BaseSchema {
  protected tableName = 'chat_sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('pinned').notNullable().defaultTo(false)
      table.boolean('unread').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pinned')
      table.dropColumn('unread')
    })
  }
}

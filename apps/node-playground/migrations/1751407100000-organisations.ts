import { defineMigration } from "@lucidcms/core/plugin";

export default defineMigration(({ adapter }) => ({
  up: async (db) => {
		await db.schema.createTable("test-organisations")
			.addColumn("name", adapter.getDataType("text"), (col) =>
				col.unique().notNull().primaryKey(),
			)
			.addColumn("createdAt", adapter.getDataType("timestamp"), (col) =>
				col.notNull().defaultTo(new Date()),
			)
			.addColumn("updatedAt", adapter.getDataType("timestamp"), (col) =>
				col.notNull().defaultTo(new Date()),
			)
			.execute()
  },
  down: async (db) => {
    await db.schema.dropTable("test-organisations").execute()
  },
}));

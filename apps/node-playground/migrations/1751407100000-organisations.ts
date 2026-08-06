import { defineMigration } from "@lucidcms/core/plugin";

export default defineMigration({
	up: async (context) => {
		await context.db.kysely.schema
			.createTable("test-organisations")
			.addColumn("name", context.config.db.getDataType("text"), (col) =>
				col.unique().notNull().primaryKey(),
			)
			.addColumn(
				"createdAt",
				context.config.db.getDataType("timestamp"),
				(col) => col.notNull().defaultTo(new Date()),
			)
			.addColumn(
				"updatedAt",
				context.config.db.getDataType("timestamp"),
				(col) => col.notNull().defaultTo(new Date()),
			)
			.execute();
	},
	down: async (context) => {
		await context.db.kysely.schema.dropTable("test-organisations").execute();
	},
});

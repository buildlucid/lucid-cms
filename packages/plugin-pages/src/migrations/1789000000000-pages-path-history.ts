import { defineMigration } from "@lucidcms/core";
import { PATH_HISTORY_TABLE } from "../constants.js";

export default defineMigration({
	async up({ context }) {
		const schema = context.db.kysely.schema;
		const adapter = context.config.db;
		const text = adapter.getDataType("text");
		const integer = adapter.getDataType("integer");

		await schema
			.createTable(PATH_HISTORY_TABLE)
			.addColumn("id", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("collection_key", text, (col) => col.notNull())
			.addColumn("document_id", integer, (col) => col.notNull())
			// The environment, or latest for collections without environments.
			.addColumn("environment", text, (col) => col.notNull())
			// Null for collections without localized paths.
			.addColumn("locale", text)
			.addColumn("path", text, (col) => col.notNull())
			.addColumn("recorded_at", text, (col) => col.notNull())
			.execute();

		await schema
			.createIndex(`${PATH_HISTORY_TABLE}_path`)
			.on(PATH_HISTORY_TABLE)
			.columns(["environment", "path"])
			.execute();

		await schema
			.createIndex(`${PATH_HISTORY_TABLE}_document`)
			.on(PATH_HISTORY_TABLE)
			.columns(["collection_key", "document_id"])
			.execute();
	},
	async down({ context }) {
		await context.db.kysely.schema.dropTable(PATH_HISTORY_TABLE).execute();
	},
});

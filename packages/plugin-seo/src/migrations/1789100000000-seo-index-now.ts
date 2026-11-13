import { defineMigration } from "@lucidcms/core";
import { indexNow } from "../constants.js";
import type { IndexNowTables } from "../services/index-now/tables.js";

export default defineMigration({
	async up({ context }) {
		const schema = context.db.kysely.schema;
		const adapter = context.config.db;
		const text = adapter.getDataType("text");
		const integer = adapter.getDataType("integer");
		const boolean = adapter.getDataType("boolean");

		await schema
			.createTable(indexNow.urlsTable)
			.addColumn("id", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("url", text, (col) => col.notNull())
			// Null when the page has no known last change.
			.addColumn("last_modified", text)
			.addColumn("listed", boolean, (col) => col.notNull())
			.addColumn("pending", boolean, (col) => col.notNull())
			.addColumn("revision", integer, (col) => col.notNull())
			.execute();

		await schema
			.createIndex(`${indexNow.urlsTable}_url`)
			.on(indexNow.urlsTable)
			.column("url")
			.unique()
			.execute();

		await schema
			.createIndex(`${indexNow.urlsTable}_pending`)
			.on(indexNow.urlsTable)
			.columns(["pending", "id"])
			.execute();

		await schema
			.createTable(indexNow.stateTable)
			.addColumn("id", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("last_sent_at", text)
			.addColumn("last_url_count", integer)
			.addColumn("revision", integer, (col) => col.notNull())
			.execute();

		// The one row each mark bumps and each send records to.
		await context.db.kysely
			.$extendTables<IndexNowTables>()
			.insertInto(indexNow.stateTable)
			.values({ revision: 0 })
			.execute();
	},
	async down({ context }) {
		await context.db.kysely.schema.dropTable(indexNow.urlsTable).execute();
		await context.db.kysely.schema.dropTable(indexNow.stateTable).execute();
	},
});

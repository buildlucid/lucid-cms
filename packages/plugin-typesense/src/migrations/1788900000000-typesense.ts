import { defineMigration } from "@lucidcms/core";

export default defineMigration({
	async up({ context }) {
		const schema = context.db.kysely.schema;
		const text = context.config.db.getDataType("text");
		const integer = context.config.db.getDataType("integer");

		await schema
			.createTable("plugin_typesense_indexes")
			.addColumn("index_key", text, (col) => col.primaryKey())
			.addColumn("active_collection", text)
			.addColumn("building_collection", text)
			.addColumn("rebuild_id", text)
			.addColumn("rebuild_prepared", text)
			.addColumn("rebuild_requested", text)
			.addColumn("rebuild_completed", text)
			.addColumn("rebuild_processed", integer, (col) =>
				col.notNull().defaultTo(0),
			)
			.addColumn("lock_token", text)
			.addColumn("lock_until", text)
			.addColumn("last_error", text)
			.addColumn("last_success", text)
			.execute();

		await schema
			.createTable("plugin_typesense_generations")
			.addColumn("collection_name", text, (col) => col.primaryKey())
			.addColumn("index_key", text, (col) => col.notNull())
			.execute();

		await schema
			.createTable("plugin_typesense_work")
			.addColumn("index_key", text, (col) => col.notNull())
			.addColumn("source_key", text, (col) => col.notNull())
			// Zero identifies a paginated source scan; positive IDs identify source items.
			.addColumn("document_id", integer, (col) => col.notNull())
			.addColumn("revision", text, (col) => col.notNull())
			.addColumn("cursor", integer, (col) => col.notNull().defaultTo(0))
			.addPrimaryKeyConstraint("plugin_typesense_work_pk", [
				"index_key",
				"source_key",
				"document_id",
			])
			.execute();

		await schema
			.createIndex("plugin_typesense_work_order")
			.on("plugin_typesense_work")
			.columns(["index_key", "document_id", "source_key"])
			.execute();

		await schema
			.createIndex("plugin_typesense_generations_index")
			.on("plugin_typesense_generations")
			.columns(["index_key", "collection_name"])
			.execute();
	},
	async down({ context }) {
		await context.db.kysely.schema
			.dropTable("plugin_typesense_generations")
			.execute();
		await context.db.kysely.schema.dropTable("plugin_typesense_work").execute();
		await context.db.kysely.schema
			.dropTable("plugin_typesense_indexes")
			.execute();
	},
});

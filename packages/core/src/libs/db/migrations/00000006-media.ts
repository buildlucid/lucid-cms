import { sql, type Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000006: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_media")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("key", adapter.getColumnType("text"), (col) =>
					col.unique().notNull(),
				)
				.addColumn("e_tag", adapter.getColumnType("text"))
				.addColumn("visible", adapter.getColumnType("boolean"), (col) =>
					col.notNull().defaultTo(adapter.config.defaults.boolean.true),
				)
				.addColumn("type", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("mime_type", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_extension", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_size", adapter.getColumnType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("width", adapter.getColumnType("integer"))
				.addColumn("height", adapter.getColumnType("integer"))
				.addColumn("blur_hash", adapter.getColumnType("text"))
				.addColumn("average_colour", adapter.getColumnType("text"))
				.addColumn("is_dark", adapter.getColumnType("boolean"))
				.addColumn("is_light", adapter.getColumnType("boolean"))
				.addColumn(
					"title_translation_key_id",
					adapter.getColumnType("integer"),
					(col) =>
						col
							.references("lucid_translation_keys.id")
							.onDelete("set null")
							.onUpdate("cascade"),
				)
				.addColumn(
					"alt_translation_key_id",
					adapter.getColumnType("integer"),
					(col) =>
						col
							.references("lucid_translation_keys.id")
							.onDelete("set null")
							.onUpdate("cascade"),
				)
				.addColumn("custom_meta", adapter.getColumnType("text"))
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(sql.raw(adapter.config.defaults.timestamp)),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(sql.raw(adapter.config.defaults.timestamp)),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_key")
				.on("lucid_media")
				.column("key")
				.execute();

			await db.schema
				.createTable("lucid_media_awaiting_sync")
				.addColumn("key", adapter.getColumnType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("timestamp", adapter.getColumnType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createTable("lucid_processed_images")
				.addColumn("key", adapter.getColumnType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("media_key", adapter.getColumnType("text"), (col) =>
					col
						.references("lucid_media.key")
						.onDelete("cascade")
						.onUpdate("cascade"),
				)
				.addColumn("file_size", adapter.getColumnType("integer"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("idx_processed_images_media_key")
				.on("lucid_processed_images")
				.column("media_key")
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000006;

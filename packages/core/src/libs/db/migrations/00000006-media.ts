import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	typeLookup,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000006: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_media")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("key", "text", (col) => col.unique().notNull())
				.addColumn("e_tag", "text")
				.addColumn("visible", "integer", (col) => col.notNull().defaultTo(1))
				.addColumn("type", "text", (col) => col.notNull())
				.addColumn("mime_type", "text", (col) => col.notNull())
				.addColumn("file_extension", "text", (col) => col.notNull())
				.addColumn("file_size", "integer", (col) => col.notNull())
				.addColumn("width", "integer")
				.addColumn("height", "integer")
				.addColumn("blur_hash", "text")
				.addColumn("average_colour", "text")
				.addColumn("is_dark", "integer")
				.addColumn("is_light", "integer")
				.addColumn("title_translation_key_id", "integer", (col) =>
					col
						.references("lucid_translation_keys.id")
						.onDelete("set null")
						.onUpdate("cascade"),
				)
				.addColumn("alt_translation_key_id", "integer", (col) =>
					col
						.references("lucid_translation_keys.id")
						.onDelete("set null")
						.onUpdate("cascade"),
				)
				.addColumn("custom_meta", "text")
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_key")
				.on("lucid_media")
				.column("key")
				.execute();

			await db.schema
				.createTable("lucid_media_awaiting_sync")
				.addColumn("key", "text", (col) => col.primaryKey())
				.addColumn("timestamp", "timestamp", (col) => col.notNull())
				.execute();

			await db.schema
				.createTable("lucid_processed_images")
				.addColumn("key", "text", (col) => col.primaryKey())
				.addColumn("media_key", "text", (col) =>
					col
						.references("lucid_media.key")
						.onDelete("cascade")
						.onUpdate("cascade"),
				)
				.addColumn("file_size", "integer", (col) => col.notNull())
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

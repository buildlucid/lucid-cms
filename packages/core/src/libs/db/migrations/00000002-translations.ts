import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";

const Migration00000002: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_translation_keys")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createTable("lucid_translations")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"translation_key_id",
					adapter.getColumnType("integer"),
					(col) =>
						col
							.references("lucid_translation_keys.id")
							.notNull()
							.onDelete("cascade")
							.onUpdate("cascade"),
				)
				.addColumn("locale_code", adapter.getColumnType("text"), (col) =>
					col
						.references("lucid_locales.code")
						.notNull()
						.onDelete("cascade")
						.onUpdate("cascade"),
				)
				.addColumn("value", adapter.getColumnType("text"))
				.addUniqueConstraint(
					"lucid_translations_translation_key_id_locale_code_unique",
					["translation_key_id", "locale_code"],
				)
				.execute();

			await db.schema
				.createIndex("idx_translation_key_locale")
				.on("lucid_translations")
				.columns(["translation_key_id", "locale_code"])
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000002;

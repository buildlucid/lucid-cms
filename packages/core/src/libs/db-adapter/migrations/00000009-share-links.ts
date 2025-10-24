import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000009: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_media_share_links")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("media_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media.id").onDelete("cascade").notNull(),
				)
				.addColumn("token", adapter.getDataType("text"), (col) =>
					col.unique().notNull(),
				)
				.addColumn("password", adapter.getDataType("text"))
				.addColumn("expires_at", adapter.getDataType("timestamp"))
				.addColumn("name", adapter.getDataType("text"))
				.addColumn("description", adapter.getDataType("text"))
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createIndex("idx_media_share_links_token")
				.on("lucid_media_share_links")
				.column("token")
				.execute();

			await db.schema
				.createIndex("idx_media_share_links_media_id")
				.on("lucid_media_share_links")
				.column("media_id")
				.execute();
		},
		async down(db: Kysely<unknown>) {
			await db.schema.dropTable("lucid_media_share_links").execute();
		},
	};
};

export default Migration00000009;

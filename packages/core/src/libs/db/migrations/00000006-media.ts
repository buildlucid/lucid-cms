import { type Kysely, sql } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000006: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_media_folders")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("title", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("tenant_key", adapter.getDataType("text"))
				.addColumn("parent_folder_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media_folders.id").onDelete("cascade"),
				)
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
				.createIndex("idx_lucid_media_folders_tenant_key")
				.on("lucid_media_folders")
				.column("tenant_key")
				.execute();

			await db.schema
				.createTable("lucid_media")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.unique().notNull(),
				)
				.addColumn("tenant_key", adapter.getDataType("text"))
				.addColumn("folder_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media_folders.id").onDelete("set null"),
				)
				.addColumn("parent_media_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media.id").onDelete("restrict"),
				)
				.addColumn("relation_type", adapter.getDataType("text"))
				.addColumn("e_tag", adapter.getDataType("text"))
				.addColumn("origin", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("public", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "true"),
							),
						),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("mime_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_extension", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_name", adapter.getDataType("text"))
				.addColumn("file_size", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("width", adapter.getDataType("integer"))
				.addColumn("height", adapter.getDataType("integer"))
				.addColumn("focal_x", adapter.getDataType("integer"))
				.addColumn("focal_y", adapter.getDataType("integer"))
				.addColumn("crop_x", adapter.getDataType("real"))
				.addColumn("crop_y", adapter.getDataType("real"))
				.addColumn("crop_width", adapter.getDataType("real"))
				.addColumn("crop_height", adapter.getDataType("real"))
				.addColumn("crop_rotation", adapter.getDataType("real"))
				.addColumn("crop_skew_x", adapter.getDataType("real"))
				.addColumn("crop_skew_y", adapter.getDataType("real"))
				.addColumn("blur_hash", adapter.getDataType("text"))
				.addColumn("average_color", adapter.getDataType("text"))
				.addColumn("base64", adapter.getDataType("text"))
				.addColumn("is_dark", adapter.getDataType("boolean"))
				.addColumn("is_light", adapter.getDataType("boolean"))
				.addColumn("custom_meta", adapter.getDataType("text"))
				.addColumn("is_hidden", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						),
				)
				.addColumn("is_deleted", adapter.getDataType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
				)
				.addColumn("is_deleted_at", adapter.getDataType("timestamp"))
				.addColumn("deleted_by", adapter.getDataType("integer"), (col) =>
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
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addUniqueConstraint(
					"lucid_media_parent_media_id_relation_type_unique",
					["parent_media_id", "relation_type"],
				)
				.addCheckConstraint(
					"lucid_media_owned_relation_complete",
					sql`(
						(parent_media_id IS NULL AND relation_type IS NULL) OR
						(parent_media_id IS NOT NULL AND relation_type IN ('crop', 'poster'))
					)`,
				)
				.addCheckConstraint(
					"lucid_media_owned_relation_not_self",
					sql`parent_media_id IS NULL OR parent_media_id <> id`,
				)
				.addCheckConstraint(
					"lucid_media_owned_relation_no_folder",
					sql`parent_media_id IS NULL OR folder_id IS NULL`,
				)
				.addCheckConstraint(
					"lucid_media_owned_relation_image_only",
					sql`relation_type IS NULL OR type = 'image'`,
				)
				.addCheckConstraint(
					"lucid_media_crop_state_valid",
					sql`(
						relation_type = 'crop' AND
						crop_x IS NOT NULL AND crop_x >= 0 AND crop_x <= 1 AND
						crop_y IS NOT NULL AND crop_y >= 0 AND crop_y <= 1 AND
						crop_width IS NOT NULL AND crop_width > 0 AND crop_width <= 1 AND
						crop_height IS NOT NULL AND crop_height > 0 AND crop_height <= 1 AND
						crop_x + crop_width <= 1.000001 AND
						crop_y + crop_height <= 1.000001 AND
						crop_rotation IS NOT NULL AND crop_rotation >= -180 AND crop_rotation <= 180 AND
						crop_skew_x IS NOT NULL AND crop_skew_x >= -45 AND crop_skew_x <= 45 AND
						crop_skew_y IS NOT NULL AND crop_skew_y >= -45 AND crop_skew_y <= 45
					) OR (
						(relation_type IS NULL OR relation_type <> 'crop') AND
						crop_x IS NULL AND crop_y IS NULL AND
						crop_width IS NULL AND crop_height IS NULL AND
						crop_rotation IS NULL AND crop_skew_x IS NULL AND crop_skew_y IS NULL
					)`,
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_key")
				.on("lucid_media")
				.column("key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_tenant_key")
				.on("lucid_media")
				.column("tenant_key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_parent_media_id")
				.on("lucid_media")
				.column("parent_media_id")
				.execute();

			await db.schema
				.alterTable("lucid_users")
				.addColumn(
					"profile_picture_media_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_media.id").onDelete("set null"),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_users_profile_picture_media_id")
				.on("lucid_users")
				.column("profile_picture_media_id")
				.execute();

			await db.schema
				.createTable("lucid_media_translations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("media_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media.id").onDelete("cascade").notNull(),
				)
				.addColumn("locale_code", adapter.getDataType("text"), (col) =>
					col
						.references("lucid_locales.code")
						.notNull()
						.onDelete("cascade")
						.onUpdate("cascade"),
				)
				.addColumn("title", adapter.getDataType("text"))
				.addColumn("alt", adapter.getDataType("text"))
				.addColumn("description", adapter.getDataType("text"))
				.addColumn("summary", adapter.getDataType("text"))
				.addUniqueConstraint(
					"lucid_media_translations_media_id_locale_code_unique",
					["media_id", "locale_code"],
				)
				.execute();

			await db.schema
				.createIndex("idx_media_translations_media_id")
				.on("lucid_media_translations")
				.column("media_id")
				.execute();

			await db.schema
				.createIndex("idx_media_translations_locale")
				.on("lucid_media_translations")
				.columns(["media_id", "locale_code"])
				.unique()
				.execute();

			await db.schema
				.createTable("lucid_media_awaiting_sync")
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("timestamp", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createTable("lucid_media_upload_sessions")
				.addColumn("session_id", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("key", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("adapter_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("adapter_upload_id", adapter.getDataType("text"))
				.addColumn("mode", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_name", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("mime_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("file_extension", adapter.getDataType("text"))
				.addColumn("file_size", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("part_size", adapter.getDataType("integer"))
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("idx_media_upload_sessions_key")
				.on("lucid_media_upload_sessions")
				.column("key")
				.execute();

			await db.schema
				.createIndex("idx_media_upload_sessions_expires_at")
				.on("lucid_media_upload_sessions")
				.column("expires_at")
				.execute();

			await db.schema
				.createTable("lucid_processed_images")
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("media_key", adapter.getDataType("text"), (col) =>
					col
						.references("lucid_media.key")
						.onDelete("cascade")
						.onUpdate("cascade"),
				)
				.addColumn("file_size", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("idx_processed_images_media_key")
				.on("lucid_processed_images")
				.column("media_key")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};
export default Migration00000006;

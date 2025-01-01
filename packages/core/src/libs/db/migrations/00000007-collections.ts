import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000007: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			// Collections
			await db.schema
				.createTable("lucid_collections")
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
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
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			// Migrations
			await db.schema
				.createTable("lucid_collection_migrations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.references("lucid_collections.key").onDelete("cascade").notNull(),
				)
				.addColumn("migration_plans", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			// ---------------------------------------------
			// EVERYTHING BELOW WILL BE DELETED
			// ---------------------------------------------

			// Collection Documents
			await db.schema
				.createTable("lucid_collection_documents")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
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

			// Document Versions
			await db.schema
				.createTable("lucid_collection_document_versions")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col
						.references("lucid_collection_documents.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("version_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				) // draft, published, revision
				.addColumn("promoted_from", adapter.getDataType("integer"), (col) =>
					col
						.references("lucid_collection_document_versions.id")
						.onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.execute();

			await db.schema
				.createIndex("idx_document_versions_document_id")
				.on("lucid_collection_document_versions")
				.column("document_id")
				.execute();

			// Bricks
			await db.schema
				.createTable("lucid_collection_document_bricks")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"collection_document_version_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_document_versions.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn("brick_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				) // builder, fixed, collection-fields
				.addColumn("brick_key", adapter.getDataType("text"))
				.addColumn("brick_order", adapter.getDataType("integer"))
				.addColumn("brick_open", adapter.getDataType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
				)
				.execute();

			// Groups
			await db.schema
				.createTable("lucid_collection_document_groups")
				.addColumn("group_id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"collection_document_version_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_document_versions.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn(
					"collection_document_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_documents.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn(
					"collection_brick_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_document_bricks.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn("parent_group_id", adapter.getDataType("integer"), (col) =>
					col
						.references("lucid_collection_document_groups.group_id")
						.onDelete("cascade"),
				)
				.addColumn("group_open", adapter.getDataType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
				)
				.addColumn("repeater_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("group_order", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("ref", adapter.getDataType("text"))
				.execute();

			await db.schema
				.createIndex("idx_lucid_groups_collection_brick_id")
				.on("lucid_collection_document_groups")
				.column("collection_brick_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_groups_parent_group_id")
				.on("lucid_collection_document_groups")
				.column("parent_group_id")
				.execute();

			// Fields
			await db.schema
				.createTable("lucid_collection_document_fields")
				.addColumn("fields_id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"collection_document_version_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_document_versions.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn(
					"collection_document_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_documents.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn(
					"collection_brick_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_collection_document_bricks.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn("group_id", adapter.getDataType("integer"), (col) =>
					col
						.references("lucid_collection_document_groups.group_id")
						.onDelete("cascade"),
				)
				.addColumn("locale_code", adapter.getDataType("text"), (col) =>
					col.references("lucid_locales.code").onDelete("cascade").notNull(),
				)
				.addColumn("key", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("text_value", adapter.getDataType("text"))
				.addColumn("int_value", adapter.getDataType("integer"))
				.addColumn("bool_value", adapter.getDataType("boolean"))
				.addColumn("json_value", adapter.getDataType("text"))
				.addColumn("media_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media.id").onDelete("set null"),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_collection_documents.id").onDelete("set null"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_fields_locale_code")
				.on("lucid_collection_document_fields")
				.column("locale_code")
				.execute();

			await db.schema
				.createIndex("idx_lucid_fields_collection_brick_id")
				.on("lucid_collection_document_fields")
				.column("collection_brick_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_fields_group_id")
				.on("lucid_collection_document_fields")
				.column("group_id")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000007;

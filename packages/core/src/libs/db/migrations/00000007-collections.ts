import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	typeLookup,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000007: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			// Collection Documents
			await db.schema
				.createTable("lucid_collection_documents")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("collection_key", "text", (col) => col.notNull())
				.addColumn("is_deleted", "integer", (col) => col.defaultTo(0))
				.addColumn("is_deleted_at", "timestamp")
				.addColumn("deleted_by", "integer", (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_by", "integer", (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_by", "integer", (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			// Document Versions
			await db.schema
				.createTable("lucid_collection_document_versions")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("document_id", "integer", (col) =>
					col
						.references("lucid_collection_documents.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("version_type", "text", (col) => col.notNull()) // draft, published, revision
				.addColumn("promoted_from", "integer", (col) =>
					col
						.references("lucid_collection_document_versions.id")
						.onDelete("set null"),
				)
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("created_by", "integer", (col) =>
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
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("collection_document_version_id", "integer", (col) =>
					col
						.references("lucid_collection_document_versions.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("brick_type", "text", (col) => col.notNull()) // builder, fixed, collection-fields
				.addColumn("brick_key", "text")
				.addColumn("brick_order", "integer")
				.addColumn("brick_open", "integer", (col) => col.defaultTo(0))
				.execute();

			// Groups
			await db.schema
				.createTable("lucid_collection_document_groups")
				.addColumn("group_id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("collection_document_version_id", "integer", (col) =>
					col
						.references("lucid_collection_document_versions.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("collection_document_id", "integer", (col) =>
					col
						.references("lucid_collection_documents.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("collection_brick_id", "integer", (col) =>
					col
						.references("lucid_collection_document_bricks.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("parent_group_id", "integer", (col) =>
					col
						.references("lucid_collection_document_groups.group_id")
						.onDelete("cascade"),
				)
				.addColumn("group_open", "integer", (col) => col.defaultTo(0))
				.addColumn("repeater_key", "text", (col) => col.notNull())
				.addColumn("group_order", "integer", (col) => col.notNull())
				.addColumn("ref", "text")
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
				.addColumn("fields_id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("collection_document_version_id", "integer", (col) =>
					col
						.references("lucid_collection_document_versions.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("collection_document_id", "integer", (col) =>
					col
						.references("lucid_collection_documents.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("collection_brick_id", "integer", (col) =>
					col
						.references("lucid_collection_document_bricks.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("group_id", "integer", (col) =>
					col
						.references("lucid_collection_document_groups.group_id")
						.onDelete("cascade"),
				)
				.addColumn("locale_code", "text", (col) =>
					col.references("lucid_locales.code").onDelete("cascade").notNull(),
				)
				.addColumn("key", "text", (col) => col.notNull())
				.addColumn("type", "text", (col) => col.notNull())
				.addColumn("text_value", "text")
				.addColumn("int_value", "integer")
				.addColumn("bool_value", "integer")
				.addColumn("json_value", "text")
				.addColumn("media_id", "integer", (col) =>
					col.references("lucid_media.id").onDelete("set null"),
				)
				.addColumn("document_id", "integer", (col) =>
					col.references("lucid_collection_documents.id").onDelete("set null"),
				)
				.addColumn("user_id", "integer", (col) =>
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

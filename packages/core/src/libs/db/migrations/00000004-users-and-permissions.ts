import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	typeLookup,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000004: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_users")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("super_admin", "integer", (col) =>
					col.defaultTo(0).notNull(),
				)
				.addColumn("email", "text", (col) => col.notNull().unique())
				.addColumn("username", "text", (col) => col.notNull().unique())
				.addColumn("first_name", "text")
				.addColumn("last_name", "text")
				.addColumn("password", "text")
				.addColumn("secret", "text", (col) => col.notNull())
				.addColumn("triggered_password_reset", "integer", (col) =>
					col.defaultTo(0),
				)
				.addColumn("is_deleted", "integer", (col) => col.defaultTo(0))
				.addColumn("is_deleted_at", "timestamp")
				.addColumn("deleted_by", "integer", (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createTable("lucid_roles")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("name", "text", (col) => col.notNull().unique())
				.addColumn("description", "text")
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createTable("lucid_role_permissions")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("role_id", "integer", (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
				)
				.addColumn("permission", "text", (col) => col.notNull())
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createTable("lucid_user_roles")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("user_id", "integer", (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("role_id", "integer", (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
				)
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createTable("lucid_user_tokens")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("user_id", "integer", (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("token_type", "varchar(255)")
				.addColumn("token", "varchar(255)", (col) => col.notNull().unique())
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("expiry_date", "timestamp", (col) => col.notNull())
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000004;

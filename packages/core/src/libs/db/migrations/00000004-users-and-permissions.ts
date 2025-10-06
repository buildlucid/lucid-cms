import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000004: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_users")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("super_admin", adapter.getDataType("boolean"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						)
						.notNull(),
				)
				.addColumn("email", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("username", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("first_name", adapter.getDataType("text"))
				.addColumn("last_name", adapter.getDataType("text"))
				.addColumn("password", adapter.getDataType("text"))
				.addColumn("secret", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"triggered_password_reset",
					adapter.getDataType("boolean"),
					(col) =>
						col.defaultTo(
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
				.execute();

			await db.schema
				.createTable("lucid_roles")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("description", adapter.getDataType("text"))
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
				.createTable("lucid_role_permissions")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("role_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
				)
				.addColumn("permission", adapter.getDataType("text"), (col) =>
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
				.createTable("lucid_user_roles")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("role_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
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
				.createTable("lucid_user_tokens")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("token_type", adapter.getDataType("varchar", 255))
				.addColumn("token", adapter.getDataType("varchar", 255), (col) =>
					col.notNull().unique(),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.addColumn("expiry_date", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createTable("lucid_user_logins")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("token_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_user_tokens.id").onDelete("set null"),
				)
				.addColumn("auth_method", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("ip_address", adapter.getDataType("varchar", 255))
				.addColumn("user_agent", adapter.getDataType("text"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000004;

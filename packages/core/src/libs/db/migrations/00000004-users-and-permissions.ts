import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000004: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_users")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("super_admin", adapter.getColumnType("boolean"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.config.defaults.boolean.false,
							),
						)
						.notNull(),
				)
				.addColumn("email", adapter.getColumnType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("username", adapter.getColumnType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("first_name", adapter.getColumnType("text"))
				.addColumn("last_name", adapter.getColumnType("text"))
				.addColumn("password", adapter.getColumnType("text"))
				.addColumn("secret", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"triggered_password_reset",
					adapter.getColumnType("boolean"),
					(col) =>
						col.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.config.defaults.boolean.false,
							),
						),
				)
				.addColumn("is_deleted", adapter.getColumnType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.config.defaults.boolean.false,
						),
					),
				)
				.addColumn("is_deleted_at", adapter.getColumnType("timestamp"))
				.addColumn("deleted_by", adapter.getColumnType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_roles")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getColumnType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("description", adapter.getColumnType("text"))
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_role_permissions")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("role_id", adapter.getColumnType("integer"), (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
				)
				.addColumn("permission", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_user_roles")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getColumnType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("role_id", adapter.getColumnType("integer"), (col) =>
					col.references("lucid_roles.id").onDelete("cascade"),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_user_tokens")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getColumnType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("token_type", adapter.getColumnType("varchar", 255))
				.addColumn("token", adapter.getColumnType("varchar", 255), (col) =>
					col.notNull().unique(),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("expiry_date", adapter.getColumnType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000004;

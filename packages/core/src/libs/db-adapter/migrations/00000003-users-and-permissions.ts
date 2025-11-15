import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000003: MigrationFn = (adapter: DatabaseAdapter) => {
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
				.addColumn(
					"invitation_accepted",
					adapter.getDataType("boolean"),
					(col) =>
						col.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						),
				)
				.addColumn("is_locked", adapter.getDataType("boolean"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						)
						.notNull(),
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
				.createTable("lucid_user_auth_providers")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade").notNull(),
				)
				.addColumn("provider_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("provider_user_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("linked_at", adapter.getDataType("timestamp"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						)
						.notNull(),
				)
				.addColumn("metadata", adapter.getDataType("json"))
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
				.createIndex("lucid_user_auth_providers_user_id_index")
				.on("lucid_user_auth_providers")
				.column("user_id")
				.execute();

			await db.schema
				.createIndex("lucid_user_auth_providers_provider_lookup_index")
				.on("lucid_user_auth_providers")
				.columns(["provider_key", "provider_user_id"])
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
					col.references("lucid_users.id").notNull().onDelete("cascade"),
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

			await db.schema
				.createTable("lucid_auth_states")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("state", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("provider_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("redirect_path", adapter.getDataType("text"))
				.addColumn("action_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"invitation_token_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_user_tokens.id").onDelete("cascade"),
				)
				.addColumn(
					"authenticated_user_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						)
						.notNull(),
				)
				.addColumn("expiry_date", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("lucid_auth_states_state_index")
				.on("lucid_auth_states")
				.column("state")
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000003;

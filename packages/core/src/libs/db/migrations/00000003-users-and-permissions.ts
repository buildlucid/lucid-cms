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
				.addColumn("key", adapter.getDataType("text"), (col) => col.unique())
				.addColumn("locked", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						),
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
				.createTable("lucid_role_translations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("role_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_roles.id").onDelete("cascade").notNull(),
				)
				.addColumn("locale_code", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("name", adapter.getDataType("text"))
				.addColumn("description", adapter.getDataType("text"))
				.addUniqueConstraint(
					"lucid_role_translations_role_id_locale_code_unique",
					["role_id", "locale_code"],
				)
				.execute();

			await db.schema
				.createIndex("idx_role_translations_role_id")
				.on("lucid_role_translations")
				.column("role_id")
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
				.addColumn("core", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "true"),
							),
						),
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
				.addColumn("revoked_at", adapter.getDataType("timestamp"))
				.addColumn("revoke_reason", adapter.getDataType("varchar", 255))
				.addColumn("consumed_at", adapter.getDataType("timestamp"))
				.addColumn(
					"replaced_by_token_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_user_tokens.id").onDelete("set null"),
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
				.createIndex("idx_lucid_user_tokens_user_id")
				.on("lucid_user_tokens")
				.column("user_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_user_tokens_refresh_lookup")
				.on("lucid_user_tokens")
				.columns(["user_id", "token_type", "revoked_at", "expiry_date"])
				.execute();

			await db.schema
				.createTable("lucid_email_change_requests")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").notNull().onDelete("cascade"),
				)
				.addColumn("old_email", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("new_email", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("confirm_token_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_user_tokens.id").notNull().onDelete("cascade"),
				)
				.addColumn("revert_token_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_user_tokens.id").notNull().onDelete("cascade"),
				)
				.addColumn("status", adapter.getDataType("varchar", 255), (col) =>
					col.notNull(),
				)
				.addColumn("confirmed_at", adapter.getDataType("timestamp"))
				.addColumn("cancelled_at", adapter.getDataType("timestamp"))
				.addColumn("reverted_at", adapter.getDataType("timestamp"))
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
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_email_change_requests_user_status")
				.on("lucid_email_change_requests")
				.columns(["user_id", "status", "expires_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_email_change_requests_confirm_token")
				.on("lucid_email_change_requests")
				.column("confirm_token_id")
				.unique()
				.execute();

			await db.schema
				.createIndex("idx_lucid_email_change_requests_revert_token")
				.on("lucid_email_change_requests")
				.column("revert_token_id")
				.unique()
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
				.addColumn("invitation_token", adapter.getDataType("text"))
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

			await db.schema
				.createTable("lucid_security_audit_logs")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("action", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("performed_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("performed_by_roles", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"performed_by_super_admin",
					adapter.getDataType("boolean"),
					(col) =>
						col
							.defaultTo(
								adapter.formatDefaultValue(
									"boolean",
									adapter.getDefault("boolean", "false"),
								),
							)
							.notNull(),
				)
				.addColumn("ip_address", adapter.getDataType("varchar", 255), (col) =>
					col.notNull(),
				)
				.addColumn("previous_value", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("new_value", adapter.getDataType("text"), (col) =>
					col.notNull(),
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
				.execute();

			await db.schema
				.createIndex("idx_lucid_security_audit_logs_user_id")
				.on("lucid_security_audit_logs")
				.column("user_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_security_audit_logs_action")
				.on("lucid_security_audit_logs")
				.column("action")
				.execute();

			await db.schema
				.createIndex("idx_lucid_security_audit_logs_performed_by")
				.on("lucid_security_audit_logs")
				.column("performed_by")
				.execute();

			await db.schema
				.createIndex("idx_lucid_security_audit_logs_created_at")
				.on("lucid_security_audit_logs")
				.column("created_at")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};
export default Migration00000003;

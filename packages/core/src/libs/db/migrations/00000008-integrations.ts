import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000008: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_integrations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("description", adapter.getDataType("text"))
				.addColumn("enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("expires_at", adapter.getDataType("timestamp"))
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("api_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("secret", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("last_used_at", adapter.getDataType("timestamp"))
				.addColumn("last_used_ip", adapter.getDataType("varchar", 255))
				.addColumn("last_used_user_agent", adapter.getDataType("text"))
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
				.createIndex("idx_lucid_integrations_key")
				.on("lucid_integrations")
				.column("key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_integrations_user_id")
				.on("lucid_integrations")
				.column("user_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_integrations_expires_at")
				.on("lucid_integrations")
				.column("expires_at")
				.execute();

			await db.schema
				.createIndex("idx_lucid_integrations_api_key")
				.on("lucid_integrations")
				.column("api_key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_integrations_secret")
				.on("lucid_integrations")
				.column("secret")
				.execute();

			await db.schema
				.createTable("lucid_integration_scopes")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("integration_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_integrations.id").onDelete("cascade").notNull(),
				)
				.addColumn("scope", adapter.getDataType("text"), (col) => col.notNull())
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
				.createIndex("idx_lucid_integration_scopes_integration_id")
				.on("lucid_integration_scopes")
				.column("integration_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_integration_scopes_scope")
				.on("lucid_integration_scopes")
				.column("scope")
				.execute();

			await db.schema
				.createTable("lucid_oauth_clients")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("client_id", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("name", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("client_uri", adapter.getDataType("text"))
				.addColumn(
					"token_endpoint_auth_method",
					adapter.getDataType("text"),
					(col) => col.notNull(),
				)
				.addColumn("client_secret_hash", adapter.getDataType("text"))
				.addColumn("client_secret_salt", adapter.getDataType("text"))
				.addColumn("logo_media_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_media.id").onDelete("set null"),
				)
				.addColumn("enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
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
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
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
				.createIndex("idx_lucid_oauth_clients_client_id")
				.on("lucid_oauth_clients")
				.column("client_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_oauth_clients_logo_media_id")
				.on("lucid_oauth_clients")
				.column("logo_media_id")
				.execute();

			await db.schema
				.createTable("lucid_oauth_client_redirect_uris")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("oauth_client_id", adapter.getDataType("integer"), (col) =>
					col
						.references("lucid_oauth_clients.id")
						.onDelete("cascade")
						.notNull(),
				)
				.addColumn("redirect_uri", adapter.getDataType("text"), (col) =>
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
				.addUniqueConstraint("lucid_oauth_client_redirect_uris_unique", [
					"oauth_client_id",
					"redirect_uri",
				])
				.execute();

			await db.schema
				.createIndex("idx_lucid_oauth_client_redirect_uris_client_id")
				.on("lucid_oauth_client_redirect_uris")
				.column("oauth_client_id")
				.execute();

			await db.schema
				.createTable("lucid_oauth_authorization_requests")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("request_id", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("client_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("client_name", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("client_uri", adapter.getDataType("text"))
				.addColumn(
					"client_logo_media_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_media.id").onDelete("set null"),
				)
				.addColumn("redirect_uri", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("resource", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("scopes", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("state", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn(
					"code_challenge",
					adapter.getDataType("varchar", 128),
					(col) => col.notNull(),
				)
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("consumed_at", adapter.getDataType("timestamp"))
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
				.createIndex("idx_lucid_oauth_authorization_requests_expires_at")
				.on("lucid_oauth_authorization_requests")
				.column("expires_at")
				.execute();

			await db.schema
				.createTable("lucid_oauth_grants")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("client_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("client_name", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("client_uri", adapter.getDataType("text"))
				.addColumn("principal_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("revoked_at", adapter.getDataType("timestamp"))
				.addColumn("last_used_at", adapter.getDataType("timestamp"))
				.addColumn("last_used_ip", adapter.getDataType("varchar", 255))
				.addColumn("last_used_user_agent", adapter.getDataType("text"))
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
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
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
				.createIndex("idx_lucid_oauth_grants_client_id")
				.on("lucid_oauth_grants")
				.column("client_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_oauth_grants_user_id")
				.on("lucid_oauth_grants")
				.column("user_id")
				.execute();

			await db.schema
				.createTable("lucid_oauth_grant_scopes")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("grant_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_oauth_grants.id").onDelete("cascade").notNull(),
				)
				.addColumn("scope", adapter.getDataType("text"), (col) => col.notNull())
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
				.addUniqueConstraint("lucid_oauth_grant_scopes_grant_scope_unique", [
					"grant_id",
					"scope",
				])
				.execute();

			await db.schema
				.createIndex("idx_lucid_oauth_grant_scopes_grant_id")
				.on("lucid_oauth_grant_scopes")
				.column("grant_id")
				.execute();

			await db.schema
				.createTable("lucid_oauth_authorization_codes")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("code_hash", adapter.getDataType("varchar", 64), (col) =>
					col.notNull().unique(),
				)
				.addColumn("grant_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_oauth_grants.id").onDelete("cascade").notNull(),
				)
				.addColumn("client_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("redirect_uri", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("resource", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"code_challenge",
					adapter.getDataType("varchar", 128),
					(col) => col.notNull(),
				)
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("consumed_at", adapter.getDataType("timestamp"))
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
				.createIndex("idx_lucid_oauth_authorization_codes_grant_id")
				.on("lucid_oauth_authorization_codes")
				.column("grant_id")
				.execute();

			await db.schema
				.createTable("lucid_oauth_refresh_tokens")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("token_hash", adapter.getDataType("varchar", 64), (col) =>
					col.notNull().unique(),
				)
				.addColumn("family_id", adapter.getDataType("varchar", 64), (col) =>
					col.notNull(),
				)
				.addColumn("grant_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_oauth_grants.id").onDelete("cascade").notNull(),
				)
				.addColumn("client_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("resource", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("consumed_at", adapter.getDataType("timestamp"))
				.addColumn("revoked_at", adapter.getDataType("timestamp"))
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
				.createIndex("idx_lucid_oauth_refresh_tokens_family_id")
				.on("lucid_oauth_refresh_tokens")
				.column("family_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_oauth_refresh_tokens_grant_id")
				.on("lucid_oauth_refresh_tokens")
				.column("grant_id")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000008;

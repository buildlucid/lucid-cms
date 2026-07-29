import { type Kysely, sql } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000011: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_remote_connections")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("disconnected"),
				)
				.addColumn("registration_encrypted", adapter.getDataType("text"))
				.addColumn("grant_encrypted", adapter.getDataType("text"))
				.addColumn("pending_encrypted", adapter.getDataType("text"))
				.addColumn(
					"pending_state_hash",
					adapter.getDataType("char", 64),
					(col) => col.unique(),
				)
				.addColumn("pending_expires_at", adapter.getDataType("integer"))
				.addColumn("display", adapter.getDataType("json"))
				.addColumn("last_attempt_at", adapter.getDataType("integer"))
				.addColumn("last_verified_at", adapter.getDataType("integer"))
				.addColumn("error_key", adapter.getDataType("text"))
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
				.addCheckConstraint(
					"lucid_remote_connections_status_valid",
					sql`status IN ('connected', 'disconnected', 'revoked')`,
				)
				.addCheckConstraint(
					"lucid_remote_connections_pending_complete",
					sql`(
							(
								pending_encrypted IS NULL AND
								pending_state_hash IS NULL AND
								pending_expires_at IS NULL
							) OR (
								pending_encrypted IS NOT NULL AND
								pending_state_hash IS NOT NULL AND
								pending_expires_at IS NOT NULL
							)
						)`,
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_remote_connections_pending_expiry")
				.on("lucid_remote_connections")
				.column("pending_expires_at")
				.execute();

			await db.schema
				.createIndex("idx_lucid_remote_connections_verification")
				.on("lucid_remote_connections")
				.columns(["status", "last_verified_at"])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000011;

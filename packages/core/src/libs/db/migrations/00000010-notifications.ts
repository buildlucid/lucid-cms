import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000010: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_notifications")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("key", adapter.getDataType("text"))
				.addColumn("category", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("level", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("action_required", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						),
				)
				.addColumn("title", adapter.getDataType("json"), (col) => col.notNull())
				.addColumn("body", adapter.getDataType("json"))
				.addColumn("href", adapter.getDataType("text"))
				.addColumn("data", adapter.getDataType("json"), (col) => col.notNull())
				.addColumn("fingerprint", adapter.getDataType("text"))
				.addColumn("revision", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(1),
				)
				.addColumn("actor_user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("resolved_at", adapter.getDataType("timestamp"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.execute();

			await db.schema
				.createIndex("uniq_lucid_notifications_type_key")
				.unique()
				.on("lucid_notifications")
				.columns(["type", "key"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_notifications_updated")
				.on("lucid_notifications")
				.columns(["updated_at"])
				.execute();

			await db.schema
				.createTable("lucid_notification_recipients")
				.addColumn("notification_id", adapter.getDataType("integer"), (col) =>
					col
						.notNull()
						.references("lucid_notifications.id")
						.onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("read_at", adapter.getDataType("timestamp"))
				.addColumn("archived_at", adapter.getDataType("timestamp"))
				.addColumn("emailed_revision", adapter.getDataType("integer"))
				.addColumn("email_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_emails.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.addPrimaryKeyConstraint("pk_lucid_notification_recipients", [
					"notification_id",
					"user_id",
				])
				.execute();

			await db.schema
				.createIndex("idx_lucid_notification_recipients_user")
				.on("lucid_notification_recipients")
				.columns(["user_id", "archived_at", "read_at"])
				.execute();

			await db.schema
				.createTable("lucid_notification_type_settings")
				.addColumn("type", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("email_enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("role_ids", adapter.getDataType("json"))
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.execute();

			await db.schema
				.createTable("lucid_notification_preferences")
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("email_enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addPrimaryKeyConstraint("pk_lucid_notification_preferences", [
					"user_id",
					"type",
				])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};
export default Migration00000010;

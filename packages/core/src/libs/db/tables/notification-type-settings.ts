import type { JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt, TimestampRequired } from "../types.js";

export const notificationTypeSettingsTable = defineTable(
	"lucid_notification_type_settings",
	(adapter) => ({
		columns: {
			type: {
				schema: z.string(),
				type: "text",
			},
			enabled: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			email_enabled: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			role_ids: {
				schema: z.array(z.number()).nullable(),
				type: "json",
			},
			updated_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** A type only has a row once someone changes it, so new types get their definition's defaults. */
export interface LucidNotificationTypeSettings {
	type: string;
	enabled: BooleanInt;
	email_enabled: BooleanInt;
	/** Roles that receive audience notifications. Null means the definition's default audience. */
	role_ids: JSONColumnType<number[] | null, number[] | null, number[] | null>;
	updated_by: number | null;
	updated_at: TimestampRequired;
}

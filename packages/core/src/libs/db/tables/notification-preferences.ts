import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt } from "../types.js";

export const notificationPreferencesTable = defineTable(
	"lucid_notification_preferences",
	(adapter) => ({
		columns: {
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			type: {
				schema: z.string(),
				type: "text",
			},
			email_enabled: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
		},
	}),
);

/** A person's email opt-in or opt-out for one type. Absent rows use the type's default. */
export interface LucidNotificationPreferences {
	user_id: number;
	type: string;
	email_enabled: BooleanInt;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const alertRecipientsTable = defineTable(
	"lucid_alert_recipients",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			alert_id: {
				schema: z.number(),
				type: "integer",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			read_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			dismissed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidAlertRecipients {
	id: Generated<number>;
	alert_id: number;
	user_id: number;
	read_at: TimestampMutable;
	dismissed_at: TimestampMutable;
	created_at: TimestampImmutable;
}

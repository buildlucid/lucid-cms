import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const notificationRecipientsTable = defineTable(
	"lucid_notification_recipients",
	() => ({
		columns: {
			notification_id: {
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
			archived_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			email_due_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			email_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidNotificationRecipients {
	notification_id: number;
	user_id: number;
	read_at: TimestampMutable;
	archived_at: TimestampMutable;
	/** When this person is due an email. Cleared once the email job handles them. */
	email_due_at: TimestampMutable;
	email_id: number | null;
	created_at: TimestampImmutable;
}

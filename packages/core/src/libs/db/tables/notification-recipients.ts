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
			emailed_revision: {
				schema: z.number().nullable(),
				type: "integer",
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
	/** The notification revision this person was last emailed about. */
	emailed_revision: number | null;
	email_id: number | null;
	created_at: TimestampImmutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampRequired } from "../types.js";

/** Wrong passwords counted per account, including accounts that don't exist, for the login limit. */
export const passwordAttemptsTable = defineTable(
	"lucid_password_attempts",
	() => ({
		columns: {
			id: { schema: z.number(), type: "primary" },
			key: { schema: z.string(), type: "text" },
			failed_attempts: { schema: z.number(), type: "integer" },
			reset_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidPasswordAttempts {
	id: Generated<number>;
	/** A keyed hash of the user ID, or of the email or username typed for an unknown account. */
	key: string;
	failed_attempts: number;
	/** When the window ends and the count starts again. */
	reset_at: TimestampRequired;
}

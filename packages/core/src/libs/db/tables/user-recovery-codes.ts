import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

/** Single-use codes that stand in for an authenticator app code. */
export const userRecoveryCodesTable = defineTable(
	"lucid_user_recovery_codes",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			code: {
				schema: z.string(),
				type: "varchar",
				args: [255],
			},
			used_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidUserRecoveryCodes {
	id: Generated<number>;
	user_id: number;
	/** HMAC of the recovery code, so a copy of the database alone can't be used. */
	code: string;
	used_at: TimestampMutable;
	created_at: TimestampImmutable;
}

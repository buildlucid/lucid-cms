import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const releaseReviewersTable = defineTable(
	"lucid_release_reviewers",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			release_id: {
				schema: z.number(),
				type: "integer",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			assigned_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			assigned_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidReleaseReviewers {
	id: Generated<number>;
	release_id: number;
	user_id: number;
	assigned_by: number | null;
	assigned_at: TimestampImmutable;
}

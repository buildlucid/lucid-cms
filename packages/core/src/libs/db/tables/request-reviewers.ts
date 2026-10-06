import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const requestReviewersTable = defineTable(
	"lucid_request_reviewers",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			request_id: {
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

export interface LucidRequestReviewers {
	id: Generated<number>;
	request_id: number;
	user_id: number;
	assigned_by: number | null;
	assigned_at: TimestampImmutable;
}

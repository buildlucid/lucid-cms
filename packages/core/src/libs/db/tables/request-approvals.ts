import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

/** An approval counts while its revision matches the request's current revision. */
export const requestApprovalsTable = defineTable(
	"lucid_request_approvals",
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
				schema: z.number().nullable(),
				type: "integer",
			},
			revision: {
				schema: z.number(),
				type: "integer",
			},
			approved_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidRequestApprovals {
	id: Generated<number>;
	request_id: number;
	user_id: number | null;
	revision: number;
	approved_at: TimestampImmutable;
}

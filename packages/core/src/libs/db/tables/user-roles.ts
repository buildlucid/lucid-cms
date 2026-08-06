import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const userRolesTable = defineTable("lucid_user_roles", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		user_id: {
			schema: z.number(),
			type: "integer",
		},
		role_id: {
			schema: z.number(),
			type: "integer",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
}));

export interface LucidUserRoles {
	id: Generated<number>;
	user_id: number | null;
	role_id: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const userLoginsTable = defineTable("lucid_user_logins", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		user_id: {
			schema: z.number(),
			type: "integer",
		},
		token_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		auth_method: {
			schema: z.string(),
			type: "text",
		},
		ip_address: {
			schema: z.string().nullable(),
			type: "varchar",
			args: [255],
		},
		user_agent: {
			schema: z.string().nullable(),
			type: "text",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	query: {
		filters: {
			authMethod: "auth_method",
			ipAddress: "ip_address",
			userAgent: "user_agent",
			createdAt: "created_at",
		},
		sorts: {
			createdAt: "created_at",
		},
	} as const,
}));

export interface LucidUserLogins {
	id: Generated<number>;
	user_id: number | null;
	token_id: number | null;
	auth_method: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: TimestampImmutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const oauthGrantsTable = defineTable("lucid_oauth_grants", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		name: {
			schema: z.string(),
			type: "text",
		},
		client_id: {
			schema: z.string(),
			type: "text",
		},
		client_name: {
			schema: z.string(),
			type: "text",
		},
		client_uri: {
			schema: z.string().nullable(),
			type: "text",
		},
		principal_type: {
			schema: z.enum(["system", "user"]),
			type: "text",
		},
		user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		created_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		revoked_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		last_used_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		last_used_ip: {
			schema: z.string().nullable(),
			type: "varchar",
			args: [255],
		},
		last_used_user_agent: {
			schema: z.string().nullable(),
			type: "text",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	results: {
		scopes: {
			schema: z
				.array(
					z.object({
						scope: z.string(),
					}),
				)
				.optional(),
		},
	},
}));

export type OAuthPrincipalType = "system" | "user";

export interface LucidOAuthGrants {
	id: Generated<number>;
	name: string;
	client_id: string;
	client_name: string;
	client_uri: string | null;
	principal_type: OAuthPrincipalType;
	user_id: number | null;
	created_by: number | null;
	revoked_at: TimestampMutable;
	last_used_at: TimestampMutable;
	last_used_ip: string | null;
	last_used_user_agent: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

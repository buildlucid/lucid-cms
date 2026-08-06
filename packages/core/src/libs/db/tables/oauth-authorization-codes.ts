import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const oauthAuthorizationCodesTable = defineTable(
	"lucid_oauth_authorization_codes",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			code_hash: {
				schema: z.string(),
				type: "varchar",
				args: [64],
			},
			grant_id: {
				schema: z.number(),
				type: "integer",
			},
			client_id: {
				schema: z.string(),
				type: "text",
			},
			redirect_uri: {
				schema: z.string(),
				type: "text",
			},
			resource: {
				schema: z.string(),
				type: "text",
			},
			code_challenge: {
				schema: z.string(),
				type: "varchar",
				args: [128],
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			consumed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidOAuthAuthorizationCodes {
	id: Generated<number>;
	code_hash: string;
	grant_id: number;
	client_id: string;
	redirect_uri: string;
	resource: string;
	code_challenge: string;
	expires_at: TimestampImmutable;
	consumed_at: TimestampMutable;
	created_at: TimestampImmutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const oauthClientRedirectUrisTable = defineTable(
	"lucid_oauth_client_redirect_uris",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			oauth_client_id: {
				schema: z.number(),
				type: "integer",
			},
			redirect_uri: {
				schema: z.string(),
				type: "text",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidOAuthClientRedirectUris {
	id: Generated<number>;
	oauth_client_id: number;
	redirect_uri: string;
	created_at: TimestampImmutable;
}

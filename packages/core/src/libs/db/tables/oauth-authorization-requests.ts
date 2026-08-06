import type { Generated } from "kysely";
import z from "zod";
import type { MediaPosterPropsT } from "../../formatters/media.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const oauthAuthorizationRequestsTable = defineTable(
	"lucid_oauth_authorization_requests",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			request_id: {
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
			client_logo_media_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			redirect_uri: {
				schema: z.string(),
				type: "text",
			},
			resource: {
				schema: z.string(),
				type: "text",
			},
			scopes: {
				schema: z.string(),
				type: "text",
			},
			state: {
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
		results: {
			client_logo: {
				schema: z.array(z.custom<MediaPosterPropsT>()).optional(),
			},
			crop: {},
			translations: {},
		},
	}),
);

export interface LucidOAuthAuthorizationRequests {
	id: Generated<number>;
	request_id: string;
	client_id: string;
	client_name: string;
	client_uri: string | null;
	client_logo_media_id: number | null;
	redirect_uri: string;
	resource: string;
	scopes: string;
	state: string;
	code_challenge: string;
	expires_at: TimestampImmutable;
	consumed_at: TimestampMutable;
	created_at: TimestampImmutable;
}

import type { Generated } from "kysely";
import z from "zod";
import type { MediaPosterPropsT } from "../../formatters/media.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const oauthClientsTable = defineTable(
	"lucid_oauth_clients",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			client_id: {
				schema: z.string(),
				type: "text",
			},
			name: {
				schema: z.string(),
				type: "text",
			},
			client_uri: {
				schema: z.string().nullable(),
				type: "text",
			},
			token_endpoint_auth_method: {
				schema: z.enum(["none", "client_secret_basic"]),
				type: "text",
			},
			client_secret_hash: {
				schema: z.string().nullable(),
				type: "text",
			},
			client_secret_salt: {
				schema: z.string().nullable(),
				type: "text",
			},
			logo_media_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			enabled: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
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
			redirect_uris: {
				schema: z
					.array(
						z.object({
							redirect_uri: z.string(),
						}),
					)
					.optional(),
			},
			logo: {
				schema: z.array(z.custom<MediaPosterPropsT>()).optional(),
			},
			crop: {},
			translations: {},
		},
	}),
);

export type OAuthClientAuthMethod = "none" | "client_secret_basic";

export interface LucidOAuthClients {
	id: Generated<number>;
	client_id: string;
	name: string;
	client_uri: string | null;
	token_endpoint_auth_method: OAuthClientAuthMethod;
	client_secret_hash: string | null;
	client_secret_salt: string | null;
	logo_media_id: number | null;
	enabled: BooleanInt;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

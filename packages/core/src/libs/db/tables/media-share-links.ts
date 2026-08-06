import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const mediaShareLinksTable = defineTable(
	"lucid_media_share_links",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			media_id: {
				schema: z.number(),
				type: "integer",
			},
			token: {
				schema: z.string(),
				type: "text",
			},
			password: {
				schema: z.string().nullable(),
				type: "text",
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			name: {
				schema: z.string().nullable(),
				type: "text",
			},
			description: {
				schema: z.string().nullable(),
				type: "text",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			updated_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
		},
		results: {
			media_is_deleted: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
			},
			media_key: {
				schema: z.string().nullable().optional(),
			},
			media_source_type: {
				schema: z.enum(["original", "crop"]),
			},
			media_origin: {
				schema: z.enum(["human", "ai_generated", "ai_modified"]).optional(),
			},
			media_type: {
				schema: z.string().nullable().optional(),
			},
			media_mime_type: {
				schema: z.string().nullable().optional(),
			},
			media_file_extension: {
				schema: z.string().nullable().optional(),
			},
			media_file_size: {
				schema: z.number().nullable().optional(),
			},
			media_width: {
				schema: z.number().nullable().optional(),
			},
			media_height: {
				schema: z.number().nullable().optional(),
			},
			media_focal_x: {
				schema: z.number().nullable().optional(),
			},
			media_focal_y: {
				schema: z.number().nullable().optional(),
			},
			media_poster_key: {
				schema: z.string().nullable().optional(),
			},
			media_poster_type: {
				schema: z.string().nullable().optional(),
			},
		},
		query: {
			filters: {
				mediaId: "media_id",
				updatedBy: "updated_by",
				createdBy: "created_by",
				token: "token",
				name: "name",
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			sorts: {
				name: "name",
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		} as const,
	}),
);

export interface LucidMediaShareLinks {
	id: Generated<number>;
	media_id: number;
	token: string;
	password: string | null;
	expires_at: TimestampMutable;
	name: string | null;
	description: string | null;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
	updated_by: number | null;
}

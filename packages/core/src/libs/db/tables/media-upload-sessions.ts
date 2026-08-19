import type { JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const mediaUploadSessionsTable = defineTable(
	"lucid_media_upload_sessions",
	() => ({
		columns: {
			session_id: {
				schema: z.string(),
				type: "text",
			},
			key: {
				schema: z.string(),
				type: "text",
			},
			adapter_key: {
				schema: z.string(),
				type: "text",
			},
			adapter_upload_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			protocol: {
				schema: z.enum(["http", "multipart-parts", "tus"]),
				type: "text",
			},
			client_data: {
				schema: z.record(z.string(), z.unknown()).nullable(),
				type: "json",
			},
			status: {
				schema: z.enum(["active", "completed", "aborted"]),
				type: "text",
			},
			file_name: {
				schema: z.string(),
				type: "text",
			},
			mime_type: {
				schema: z.string(),
				type: "text",
			},
			file_extension: {
				schema: z.string().nullable(),
				type: "text",
			},
			file_size: {
				schema: z.number(),
				type: "integer",
			},
			part_size: {
				schema: z.number().nullable(),
				type: "integer",
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
			expires_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidMediaUploadSessions {
	session_id: string;
	key: string;
	adapter_key: string;
	adapter_upload_id: string | null;
	protocol: "http" | "multipart-parts" | "tus";
	client_data: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	status: "active" | "completed" | "aborted";
	file_name: string;
	mime_type: string;
	file_extension: string | null;
	file_size: number;
	part_size: number | null;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
	expires_at: TimestampImmutable;
}

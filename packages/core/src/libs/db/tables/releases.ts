import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const releaseStatusSchema = z.enum(["open", "released", "closed"]);
/** Publish releases move existing documents to environments. Create releases request one new document. */
export const releaseTypeSchema = z.enum(["publish", "create"]);

export const releasesTable = defineTable("lucid_releases", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		type: {
			schema: releaseTypeSchema,
			type: "text",
		},
		title: {
			schema: z.string(),
			type: "text",
		},
		description: {
			schema: richTextJSONSchema.nullable(),
			type: "json",
		},
		status: {
			schema: releaseStatusSchema,
			type: "text",
		},
		revision: {
			schema: z.number(),
			type: "integer",
		},
		approved_revision: {
			schema: z.number().nullable(),
			type: "integer",
		},
		approved_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		approved_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		scheduled_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		scheduled_timezone: {
			schema: z.string().nullable(),
			type: "text",
		},
		scheduled_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		execution_job_id: {
			schema: z.string().nullable(),
			type: "text",
		},
		failure: {
			schema: z.string().nullable(),
			type: "text",
		},
		failure_release_document_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		failure_target: {
			schema: z.string().nullable(),
			type: "text",
		},
		released_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		lock_token: {
			schema: z.string().nullable(),
			type: "text",
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
		documents: {
			schema: z.array(
				z.object({
					id: z.number(),
					collection_key: z.string(),
					document_id: z.number(),
					source: z.string(),
					source_version_id: z.number().nullable(),
					targets: z.array(z.object({ target: z.string() })),
				}),
			),
		},
		reviewers: {
			schema: z.array(z.object({ user_id: z.number() })),
		},
	},
	query: {
		filters: {
			type: "lucid_releases.type",
			title: "lucid_releases.title",
			status: "lucid_releases.status",
			createdBy: "lucid_releases.created_by",
			createdAt: "lucid_releases.created_at",
			updatedAt: "lucid_releases.updated_at",
			scheduledAt: "lucid_releases.scheduled_at",
		},
		sorts: {
			createdAt: "lucid_releases.created_at",
			updatedAt: "lucid_releases.updated_at",
			scheduledAt: "lucid_releases.scheduled_at",
		},
	},
}));

export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;
export type ReleaseType = z.infer<typeof releaseTypeSchema>;

export interface LucidReleases {
	id: Generated<number>;
	type: ReleaseType;
	title: string;
	description: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	status: ReleaseStatus;
	revision: number;
	approved_revision: number | null;
	approved_by: number | null;
	approved_at: TimestampMutable;
	scheduled_at: TimestampMutable;
	scheduled_timezone: string | null;
	scheduled_by: number | null;
	execution_job_id: string | null;
	failure: string | null;
	failure_release_document_id: number | null;
	failure_target: string | null;
	released_at: TimestampMutable;
	lock_token: string | null;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

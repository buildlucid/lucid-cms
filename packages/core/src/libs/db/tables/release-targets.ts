import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampMutable } from "../types.js";

export const releaseTargetsTable = defineTable("lucid_release_targets", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		release_document_id: {
			schema: z.number(),
			type: "integer",
		},
		target: {
			schema: z.string(),
			type: "text",
		},
		reviewed_version_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		reviewed_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		reviewed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		approved_version_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
	},
}));

export interface LucidReleaseTargets {
	id: Generated<number>;
	release_document_id: number;
	target: string;
	/** The destination version acknowledged after someone else published to it. */
	reviewed_version_id: number | null;
	reviewed_by: number | null;
	reviewed_at: TimestampMutable;
	/** Destination identity checked again before publishing approved content. */
	approved_version_id: number | null;
}

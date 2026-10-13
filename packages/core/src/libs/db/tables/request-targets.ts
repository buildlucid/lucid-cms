import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampMutable } from "../types.js";

export const requestTargetsTable = defineTable("lucid_request_targets", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		request_document_id: {
			schema: z.number(),
			type: "integer",
		},
		target: {
			schema: z.string(),
			type: "text",
		},
		acknowledged_version_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		acknowledged_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		acknowledged_by_run_id: {
			schema: z.uuid().nullable(),
			type: "text",
		},
		acknowledged_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		approved_version_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
	},
}));

export interface LucidRequestTargets {
	id: Generated<number>;
	request_document_id: number;
	target: string;
	/** The target version acknowledged after someone else published to it. */
	acknowledged_version_id: number | null;
	acknowledged_by: number | null;
	/** The agent run that acknowledged it, for `acknowledged_by` or the system. */
	acknowledged_by_run_id: string | null;
	acknowledged_at: TimestampMutable;
	/** Target identity checked again before publishing approved content. */
	approved_version_id: number | null;
}

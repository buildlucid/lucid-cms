import type { JSONColumnType } from "kysely";
import z from "zod";
import { agentRoutineEventNameSchema } from "../../agent/routine-events.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampDefaulted, TimestampImmutable } from "../types.js";

export const agentRoutinePendingTable = defineTable(
	"lucid_agent_routine_pending",
	() => ({
		columns: {
			id: { schema: z.uuid(), type: "text" },
			routine_id: { schema: z.uuid(), type: "text" },
			event: { schema: agentRoutineEventNameSchema, type: "text" },
			subject_type: {
				schema: z.enum(["document", "media", "request"]),
				type: "text",
			},
			subject_id: { schema: z.number().int(), type: "integer" },
			collection_key: { schema: z.string().nullable(), type: "text" },
			subject_key: { schema: z.string(), type: "text" },
			fields: { schema: z.array(z.string()), type: "json" },
			first_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			last_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** Pending change keyed by routine, event and resource, retaining its first occurrence across repeats. */
export interface LucidAgentRoutinePending {
	id: string;
	routine_id: string;
	event: z.infer<typeof agentRoutineEventNameSchema>;
	subject_type: "document" | "media" | "request";
	subject_id: number;
	/** Set for documents, which are read through their collection. */
	collection_key: string | null;
	/** Stable resource key used to match repeats, such as `document:page:1:latest`. */
	subject_key: string;
	/** Changed fields accumulated across repeats, such as `["file"]`, or empty when unknown. */
	fields: JSONColumnType<string[], string[], string[]>;
	first_at: TimestampImmutable;
	last_at: TimestampDefaulted;
}

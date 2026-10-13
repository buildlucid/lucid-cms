import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt } from "../types.js";

export const agentRoutineToolsTable = defineTable(
	"lucid_agent_routine_tools",
	(adapter) => ({
		columns: {
			routine_id: { schema: z.uuid(), type: "text" },
			tool_name: { schema: z.string(), type: "text" },
			requires_confirmation: {
				schema: z
					.union([
						z.literal(adapter.config.defaults.boolean.true),
						z.literal(adapter.config.defaults.boolean.false),
					])
					.nullable(),
				type: "boolean",
			},
		},
	}),
);

/** A routine's settings for one tool. Null settings use the tool's defaults. */
export interface LucidAgentRoutineTools {
	routine_id: string;
	tool_name: string;
	requires_confirmation: BooleanInt | null;
}

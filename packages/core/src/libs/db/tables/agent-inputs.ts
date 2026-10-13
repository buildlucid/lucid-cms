import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { agentReferenceInputSchema } from "../../../schemas/agent-references.js";
import { agentScreenSchema } from "../../../schemas/agent-screen.js";
import type {
	AgentReferenceInput,
	AgentScreen,
} from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

/** Pending and claimed input is still to be delivered; the rest is kept as a receipt. */
const agentInputStatusSchema = z.enum([
	"pending",
	"claimed",
	"consumed",
	"cancelled",
]);

export const agentInputsTable = defineTable("lucid_agent_inputs", () => ({
	columns: {
		sequence: { schema: z.number().int(), type: "integer" },
		id: { schema: z.uuid(), type: "text" },
		conversation_id: { schema: z.uuid(), type: "text" },
		user_id: { schema: z.number(), type: "integer" },
		text: { schema: z.string(), type: "text" },
		references: { schema: z.array(agentReferenceInputSchema), type: "json" },
		screen: { schema: agentScreenSchema.nullable(), type: "json" },
		target_run_id: { schema: z.uuid().nullable(), type: "text" },
		status: { schema: agentInputStatusSchema, type: "text" },
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
}));

/** Input sent while the agent is busy. `sequence` orders the queue; `target_run_id` marks a steer. */
export interface LucidAgentInputs {
	sequence: Generated<number>;
	id: string;
	conversation_id: string;
	/** Who sent it. The run it starts acts for them. */
	user_id: number;
	text: string;
	references: JSONColumnType<
		AgentReferenceInput[],
		AgentReferenceInput[] | undefined,
		AgentReferenceInput[]
	>;
	/** The admin screen it was sent from, which answers the agent's builder tools. */
	screen: JSONColumnType<
		AgentScreen | null,
		AgentScreen | null,
		AgentScreen | null
	>;
	target_run_id: string | null;
	status: Generated<z.infer<typeof agentInputStatusSchema>>;
	created_at: TimestampImmutable;
}

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

const agentInputSourceSchema = z.enum(["person", "parent"]);

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
		user_id: { schema: z.number().nullable(), type: "integer" },
		source: { schema: agentInputSourceSchema, type: "text" },
		text: { schema: z.string(), type: "text" },
		references: { schema: z.array(agentReferenceInputSchema), type: "json" },
		screen: { schema: agentScreenSchema.nullable(), type: "json" },
		timezone: { schema: z.string().nullable(), type: "text" },
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
	/** Who the run it starts acts for: the person who sent it, or the parent run's person. Null for the system. */
	user_id: number | null;
	/** Sent by a person, or by the agent that started this sub-agent. */
	source: Generated<z.infer<typeof agentInputSourceSchema>>;
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
	/** Sender's timezone, such as `Europe/London`, used to format local message time. */
	timezone: string | null;
	target_run_id: string | null;
	status: Generated<z.infer<typeof agentInputStatusSchema>>;
	created_at: TimestampImmutable;
}

import z from "zod";
import {
	agentReferencePartSchema,
	agentRoutinePartSchema,
	agentScreenPartSchema,
	agentTextPartSchema,
	agentToolDetailsSchema,
	agentWidgetSchema,
} from "../../schemas/agent.js";

/** Stored message parts, which keep full tool values for recovery, audit and model context. */
export const agentMessagePartSchema = z.discriminatedUnion("type", [
	agentTextPartSchema,
	agentReferencePartSchema,
	agentScreenPartSchema,
	agentRoutinePartSchema,
	agentToolDetailsSchema,
	agentWidgetSchema,
]);

export type StoredAgentMessagePart = z.output<typeof agentMessagePartSchema>;

/** A widget waiting on, or holding, a person's answer to a tool's interaction. */
export const agentInteractiveWidgetSchema = agentWidgetSchema.required({
	interaction: true,
});

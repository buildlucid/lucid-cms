import z from "zod";

/** Optional agent attribution supplied through `execution.actor.agentRunId`. */
const agentRunIdSchema = z.uuid().optional();

/** User actor whose live permissions apply, required for actions such as approving. */
export const toolkitUserActorSchema = z.strictObject({
	type: z.literal("user"),
	userId: z.number().int().positive(),
	agentRunId: agentRunIdSchema,
});

/** Identifies user or system changes, with no user attribution for system changes. */
export const toolkitActorSchema = z.discriminatedUnion("type", [
	z.strictObject({ type: z.literal("system"), agentRunId: agentRunIdSchema }),
	toolkitUserActorSchema,
]);

/** User with live permissions or trusted system actor, available to tools as `execution.actor`. */
export type ToolkitActor = z.infer<typeof toolkitActorSchema>;

import z from "zod";

export const paginationSchema = z.object({
	/** One-based page number. Defaults to 1. */
	page: z.number().int().positive().default(1),
	/** Maximum items per page. Use -1 for all matches. Defaults to 10. */
	perPage: z.union([z.literal(-1), z.number().int().positive()]).default(10),
});

/** The agent run acting for the actor. Agent tools receive it as `execution.actor`. */
const agentRunIdSchema = z.uuid().optional();

/** A person acting with their live permissions. Required where only a person can act, such as approving. */
export const toolkitUserActorSchema = z.strictObject({
	kind: z.literal("user"),
	userId: z.number().int().positive(),
	agentRunId: agentRunIdSchema,
});

/** Identifies who is making a change. System changes have no user attribution. */
export const toolkitActorSchema = z.discriminatedUnion("kind", [
	z.strictObject({ kind: z.literal("system"), agentRunId: agentRunIdSchema }),
	toolkitUserActorSchema,
]);

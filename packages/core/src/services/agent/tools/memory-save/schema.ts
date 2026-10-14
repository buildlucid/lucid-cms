import type {
	AgentMemoryReviewData,
	AgentMemoryReviewItem,
	AgentMemoryReviewResponse,
	AgentMemoryScope,
} from "@lucidcms/types";
import z from "zod";
import constants from "../../../../constants/constants.js";
import {
	agentMemoryContentSchema,
	agentMemoryScopeSchema,
} from "../../../../schemas/agent-memories.js";

export const inputSchema = z
	.object({
		content: agentMemoryContentSchema.meta({
			description:
				'The memory as one plain sentence that makes sense on its own, eg. "Use British spelling." or "In SEO titles, put the brand name last."',
		}),
		scope: agentMemoryScopeSchema.meta({
			description:
				"personal for the person's own preferences. shared for guidance everyone on the site should follow, such as brand voice, terminology or editorial rules.",
		}),
		replaces: z
			.array(z.uuid())
			.max(constants.agent.memory.changeLimit)
			.default([])
			.meta({
				description:
					"IDs of memories this one updates or merges. They are removed when it is saved.",
			}),
	})
	.strict();

export const outputSchema = z.object({
	memory: z
		.object({
			id: z.uuid(),
			scope: agentMemoryScopeSchema,
			content: z.string(),
		})
		.meta({
			description:
				"The memory as the person saved it, which may differ from what you proposed.",
		}),
});

/** A memory shown in the review widget. */
export const reviewItemSchema = z
	.object({
		id: z.uuid(),
		scope: agentMemoryScopeSchema,
		content: z.string(),
	})
	.strict() satisfies z.ZodType<AgentMemoryReviewItem>;

/** The proposed memory and the memories it replaces, as the review widget shows them. */
export const reviewDataSchema = z
	.object({
		action: z.literal("save"),
		content: z.string(),
		scope: agentMemoryScopeSchema,
		scopes: z.array(agentMemoryScopeSchema).min(1),
		contentChars: z.number(),
		replaces: z.array(reviewItemSchema),
	})
	.strict() satisfies z.ZodType<
	Extract<AgentMemoryReviewData, { action: "save" }>
>;

/** The memory as the person approved it, in one of the scopes they were offered. */
export const reviewResponseSchema = (scopes: AgentMemoryScope[]) =>
	z
		.object({
			content: agentMemoryContentSchema,
			scope: agentMemoryScopeSchema.refine((scope) => scopes.includes(scope)),
		})
		.strict() satisfies z.ZodType<AgentMemoryReviewResponse>;

import type { AgentMemoryReviewData } from "@lucidcms/types";
import z from "zod";
import constants from "../../../../constants/constants.js";
import { reviewItemSchema } from "../memory-save/schema.js";

export const inputSchema = z
	.object({
		memoryIds: z
			.array(z.uuid())
			.min(1)
			.max(constants.agent.memory.changeLimit)
			.meta({ description: "IDs of the memories to forget." }),
	})
	.strict();

export const outputSchema = z.object({
	memoryIds: z
		.array(z.uuid())
		.meta({ description: "IDs of the memories that were forgotten." }),
});

/** The memories the review widget asks the person to forget. */
export const reviewDataSchema = z
	.object({
		action: z.literal("delete"),
		memories: z.array(reviewItemSchema),
	})
	.strict() satisfies z.ZodType<
	Extract<AgentMemoryReviewData, { action: "delete" }>
>;

/** Confirming a delete carries no changes. */
export const reviewResponseSchema = z.object({}).strict();

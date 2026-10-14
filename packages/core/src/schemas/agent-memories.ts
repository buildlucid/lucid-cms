import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import type {
	AgentMemories,
	AgentMemory,
	AgentMemoryScope,
} from "../types/response.js";
import { agentActorSchema } from "./shared/agent-actor.js";
import { userDisplaySchema } from "./shared/user-display.js";

export const agentMemoryScopeSchema = z.enum(["personal", "shared"]).meta({
	description:
		"Personal memories belong to one person. Shared memories guide agents for everyone on the site.",
	example: "personal",
}) satisfies z.ZodType<AgentMemoryScope>;

export const agentMemoryContentSchema = z
	.string()
	.trim()
	.min(1)
	.max(constants.agent.memory.contentChars)
	.meta({
		description: "The memory, as one plain sentence",
		example: "Use British spelling.",
	});

const agentMemoryResponseSchema = z.object({
	id: z.uuid(),
	scope: agentMemoryScopeSchema,
	content: z.string(),
	createdBy: userDisplaySchema.nullable(),
	createdByAgent: agentActorSchema.nullable(),
	updatedBy: userDisplaySchema.nullable(),
	updatedByAgent: agentActorSchema.nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
}) satisfies z.ZodType<AgentMemory>;

const agentMemoryListResponseSchema = z.object({
	enabled: z.boolean().meta({
		description: "Whether the scope is turned on",
		example: true,
	}),
	limit: z.number().meta({
		description: "The most memories the scope keeps",
		example: 30,
	}),
	memories: z.array(agentMemoryResponseSchema),
});

const memoryBody = z.object({
	scope: agentMemoryScopeSchema,
	content: agentMemoryContentSchema,
});
const noQuery = { string: undefined, formatted: undefined };

export const controllerSchemas = {
	getMemories: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: z.object({
			personal: agentMemoryListResponseSchema,
			shared: agentMemoryListResponseSchema,
			contentChars: z.number().meta({
				description: "The longest a memory can be, in characters",
				example: 300,
			}),
		}) satisfies z.ZodType<AgentMemories>,
	} satisfies ControllerSchema,
	createMemory: {
		body: memoryBody,
		query: noQuery,
		params: undefined,
		response: agentMemoryResponseSchema,
	} satisfies ControllerSchema,
	updateMemory: {
		body: memoryBody,
		query: noQuery,
		params: z.object({ id: z.uuid() }),
		response: agentMemoryResponseSchema,
	} satisfies ControllerSchema,
	deleteMemories: {
		body: z.object({
			ids: z
				.array(z.uuid())
				.min(1)
				.max(constants.agent.memory.maxLimit)
				.meta({ description: "The memory IDs" }),
		}),
		query: noQuery,
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

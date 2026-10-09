import z from "zod";
import type {
	AgentReferenceInput,
	AgentReferenceSnapshot,
} from "../types/response.js";

/** A Lucid resource linked to a conversation. */
export const agentReferenceInputSchema = z.discriminatedUnion("type", [
	z
		.object({ type: z.literal("media"), mediaId: z.number().int().positive() })
		.strict(),
	z
		.object({
			type: z.literal("document"),
			collectionKey: z.string().min(1),
			documentId: z.number().int().positive(),
			versionId: z.number().int().positive().optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("request"),
			requestId: z.number().int().positive(),
		})
		.strict(),
]) satisfies z.ZodType<AgentReferenceInput>;

/** Whether a person attached a resource to a message or a tool linked it. */
export const agentReferenceSourceTypeSchema = z.enum(["message", "tool"]);

const snapshotDetails = {
	label: z.string(),
	mimeType: z.string().optional(),
};

/** A reference with the details saved when it was attached to a message. */
export const agentReferenceSnapshotSchema = z.discriminatedUnion("type", [
	agentReferenceInputSchema.options[0].extend(snapshotDetails),
	agentReferenceInputSchema.options[1].extend(snapshotDetails),
	agentReferenceInputSchema.options[2].extend(snapshotDetails),
]) satisfies z.ZodType<AgentReferenceSnapshot>;

const referenceDetails = {
	...snapshotDetails,
	id: z.uuid(),
	previewUrl: z.string().optional(),
	source: z.discriminatedUnion("type", [
		z.object({ type: z.literal("message") }),
		z.object({ type: z.literal("tool"), toolName: z.string() }),
	]),
	managed: z.boolean(),
};

export const agentReferenceSchema = z.discriminatedUnion("type", [
	agentReferenceInputSchema.options[0].extend(referenceDetails),
	agentReferenceInputSchema.options[1].extend({
		...referenceDetails,
		version: z.string().optional(),
	}),
	agentReferenceInputSchema.options[2].extend(referenceDetails),
]);

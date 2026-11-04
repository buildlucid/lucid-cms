import z from "zod";
import type {
	AgentDocumentFocus,
	AgentReferenceInput,
	AgentReferenceSnapshot,
	AgentResource,
} from "../types/response.js";

/** A media item, document or request in Lucid, eg. one a tool call changed. */
export const agentResourceSchema = z.discriminatedUnion("type", [
	z
		.object({ type: z.literal("media"), mediaId: z.number().int().positive() })
		.strict(),
	z
		.object({
			type: z.literal("document"),
			collectionKey: z.string().min(1),
			documentId: z.number().int().positive(),
		})
		.strict(),
	z
		.object({
			type: z.literal("request"),
			requestId: z.number().int().positive(),
		})
		.strict(),
]) satisfies z.ZodType<AgentResource>;

/** A brick or field of a document a person pointed the agent at, eg. picked on the builder's preview. */
const agentDocumentFocusSchema = z
	.object({
		brick: z.string().min(1).max(128).optional(),
		path: z.array(z.string().min(1).max(128)).max(32),
		label: z.string().min(1).max(256),
	})
	.strict()
	.refine((focus) => focus.brick !== undefined || focus.path.length > 0, {
		message: "Give a brick or field",
	}) satisfies z.ZodType<AgentDocumentFocus>;

const documentReferenceInputSchema = agentResourceSchema.options[1].extend({
	versionId: z.number().int().positive().optional(),
});

/** A resource the agent links itself. Kept without a document's focus, so the linking tool's input stays small. */
export const agentAttachableReferenceInputSchema = z.discriminatedUnion(
	"type",
	[
		agentResourceSchema.options[0],
		documentReferenceInputSchema,
		agentResourceSchema.options[2],
	],
) satisfies z.ZodType<Exclude<AgentReferenceInput, { type: "deploy" }>>;

/** A resource people attach to messages, where a document can point at one of its bricks or fields. */
export const agentMessageReferenceInputSchema = z.discriminatedUnion("type", [
	agentResourceSchema.options[0],
	documentReferenceInputSchema.extend({
		focus: agentDocumentFocusSchema.optional(),
	}),
	agentResourceSchema.options[2],
]) satisfies z.ZodType<Exclude<AgentReferenceInput, { type: "deploy" }>>;

/** A Lucid resource linked to a conversation. Deploys are only linked by the tool that runs them. */
export const agentReferenceInputSchema = z.discriminatedUnion("type", [
	...agentMessageReferenceInputSchema.options,
	z
		.object({ type: z.literal("deploy"), deployKey: z.string().min(1) })
		.strict(),
]) satisfies z.ZodType<AgentReferenceInput>;

const snapshotDetails = {
	label: z.string(),
	mimeType: z.string().optional(),
};

/** A reference with the details saved when it was attached to a message. */
export const agentReferenceSnapshotSchema = z.discriminatedUnion("type", [
	agentReferenceInputSchema.options[0].extend(snapshotDetails),
	agentReferenceInputSchema.options[1].extend(snapshotDetails),
	agentReferenceInputSchema.options[2].extend(snapshotDetails),
	agentReferenceInputSchema.options[3].extend(snapshotDetails),
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
	//* linked documents don't keep the focus an attachment had
	documentReferenceInputSchema.extend({
		...referenceDetails,
		version: z.string().optional(),
	}),
	agentReferenceInputSchema.options[2].extend(referenceDetails),
	agentReferenceInputSchema.options[3].extend(referenceDetails),
]);

import z from "zod";
import type {
	AgentBuilderTarget,
	AgentScreen,
	AgentScreenResponse,
} from "../types/response.js";
import { brickInputSchema } from "./collection-bricks.js";
import { fieldInputSchema } from "./collection-fields.js";

/** The admin shortens longer labels, eg. a long document title, to fit. */
const screenLabelLength = 200;

const screenDetails = {
	tabId: z.string().trim().min(1).max(64),
	label: z.string().trim().max(screenLabelLength),
};

/** The admin screen a message was sent from. */
export const agentScreenSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("document"),
			...screenDetails,
			collectionKey: z.string().min(1),
			documentId: z.number().int().positive().nullable(),
			requestId: z.number().int().positive().nullable(),
		})
		.strict(),
	z
		.object({
			type: z.literal("request"),
			...screenDetails,
			requestId: z.number().int().positive(),
		})
		.strict(),
]) satisfies z.ZodType<AgentScreen>;

export const agentBuilderTargetSchema = z
	.object({
		brick: z.string().min(1).optional().meta({
			description:
				"A builder brick's ref or a fixed brick's key, from lucid_builder_read. Omit it for the document's own fields.",
		}),
		field: z.string().min(1).optional().meta({
			description: "A top-level field key. Omit it to show the whole brick.",
		}),
		contentLocale: z.string().min(1).optional().meta({
			description: "Switches the editor to this content language first.",
		}),
	})
	.refine(
		(target) => target.brick !== undefined || target.field !== undefined,
		{
			message: "Give a brick or field",
		},
	) satisfies z.ZodType<AgentBuilderTarget>;

/** A document's content as the builder holds it. */
export const agentBuilderContentSchema = z.object({
	fields: z.array(fieldInputSchema),
	bricks: z.array(brickInputSchema),
});

/** Defines screen tool responses whose document content is checked again during conversion. */
export const agentScreenResponseSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("done"),
		document: z
			.object({
				revision: z.number().int().nonnegative(),
				versionId: z.number().int().positive().nullable(),
				content: agentBuilderContentSchema,
				contentLocale: z.string().nullable(),
				unsaved: z.boolean(),
				editable: z.boolean(),
			})
			.optional(),
	}),
	z.object({
		status: z.literal("unavailable"),
		reason: z.enum(["closed", "moved", "locked", "changed", "missing"]),
		screen: agentScreenSchema.optional(),
	}),
]) satisfies z.ZodType<AgentScreenResponse>;

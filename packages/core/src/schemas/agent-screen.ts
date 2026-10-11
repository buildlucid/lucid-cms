import z from "zod";
import type {
	AgentBuilderChange,
	AgentBuilderTarget,
	AgentScreen,
	AgentScreenResponse,
	Refs,
} from "../types/response.js";
import { isJsonObject } from "../utils/helpers/is-json-object.js";
import { brickInputSchema } from "./collection-bricks.js";
import { fieldInputSchema } from "./collection-fields.js";

/** The admin shortens longer labels, eg. a long document title, to fit. */
const screenLabelLength = 200;

const screenDetails = {
	tabId: z.string().trim().min(1).max(64),
	label: z.string().trim().max(screenLabelLength),
};
/** A list's applied filter preset, labelled like its name. */
const screenFilter = z.string().trim().max(screenLabelLength).nullable();

/** A document open in the builder, which the builder tools work on. */
const documentScreenSchema = z
	.object({
		type: z.literal("document"),
		...screenDetails,
		collectionKey: z.string().min(1),
		documentId: z.number().int().positive().nullable(),
		requestId: z.number().int().positive().nullable(),
	})
	.strict();

/** The admin screen a message was sent from. */
export const agentScreenSchema = z.discriminatedUnion("type", [
	documentScreenSchema,
	z
		.object({
			type: z.literal("request"),
			...screenDetails,
			requestId: z.number().int().positive(),
		})
		.strict(),
	z
		.object({
			type: z.literal("documents"),
			...screenDetails,
			collectionKey: z.string().min(1),
			contentLocale: z.string().min(1).nullable(),
			filter: screenFilter,
		})
		.strict(),
	z
		.object({
			type: z.literal("media"),
			...screenDetails,
			folderId: z.number().int().positive().nullable(),
			filter: screenFilter,
		})
		.strict(),
	z
		.object({
			type: z.literal("requests"),
			...screenDetails,
			filter: screenFilter,
		})
		.strict(),
	z.object({ type: z.literal("review"), ...screenDetails }).strict(),
	z
		.object({
			type: z.literal("history"),
			...screenDetails,
			collectionKey: z.string().min(1),
			documentId: z.number().int().positive(),
			versionId: z.number().int().positive().nullable(),
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

/** A change the builder update tool hands the builder, then saves for the chat once it is applied. */
export const agentBuilderChangeSchema = z.object({
	brick: z
		.object({
			type: z.enum(["builder", "fixed", "embedded"]),
			key: z.string(),
			ref: z.string(),
		})
		.nullable(),
	status: z.enum(["added", "removed", "changed"]),
	moved: z.boolean(),
	fields: z.array(
		z.object({ path: z.array(z.string()), locales: z.array(z.string()) }),
	),
}) satisfies z.ZodType<AgentBuilderChange>;

const agentBuilderContentChangesSchema = agentBuilderContentSchema.extend({
	removed: z.array(z.string()),
	order: z.array(z.string()).nullable(),
});

/** Saved `lucid-screen` requests for the browser to read, update, or focus the builder. */
export const agentScreenCallSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("read"), screen: agentScreenSchema }),
	z.object({
		action: z.literal("update"),
		screen: documentScreenSchema,
		revision: z.number().int().nonnegative(),
		versionId: z.number().int().positive().nullable(),
		content: agentBuilderContentChangesSchema,
		//* Database-resolved refs only need JSON shape validation.
		refs: z.custom<Refs>(isJsonObject),
		changes: z.array(agentBuilderChangeSchema),
		validationErrors: z.array(z.string()),
	}),
	z.object({
		action: z.literal("focus"),
		screen: documentScreenSchema,
		target: agentBuilderTargetSchema,
	}),
]);

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

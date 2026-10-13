import type {
	AgentBuilderChange,
	AgentBuilderFocus,
	AgentScreenResponse,
} from "@lucidcms/types";
import z from "zod";
import {
	agentScreenSchema,
	documentScreenSchema,
} from "../../schemas/agent-screen.js";
import { brickInputSchema } from "../../schemas/collection-bricks.js";
import { fieldInputSchema } from "../../schemas/collection-fields.js";
import type { Refs } from "../../types/response.js";
import { isJsonObject } from "../../utils/helpers/is-json-object.js";

/** A field or brick to show in the document builder, taken by the builder focus tool. */
export const agentBuilderFocusSchema = z
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
	.refine((focus) => focus.brick !== undefined || focus.field !== undefined, {
		message: "Give a brick or field",
	}) satisfies z.ZodType<AgentBuilderFocus>;

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
		//* Database-resolved references require only JSON shape validation.
		refs: z.custom<Refs>(isJsonObject),
		changes: z.array(agentBuilderChangeSchema),
		validationErrors: z.array(z.string()),
	}),
	z.object({
		action: z.literal("focus"),
		screen: documentScreenSchema,
		focus: agentBuilderFocusSchema,
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

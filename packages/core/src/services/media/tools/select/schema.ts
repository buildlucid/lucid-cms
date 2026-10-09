import z from "zod";
import constants from "../../../../constants/constants.js";
import type {
	AgentMediaSelectData,
	AgentMediaSelectResponse,
} from "../../../../types/response.js";
import { mediaItemSchema, mediaTypes } from "../helpers/schema.js";

export const inputSchema = z.object({
	message: z.string().trim().min(1).max(500).meta({
		description:
			"What the person should pick and why, eg. 'Choose a hero image for the About page'.",
	}),
	types: z.array(z.enum(mediaTypes)).min(1).optional().meta({
		description: "Media types the person can pick; any type when left out.",
	}),
	max: z
		.number()
		.int()
		.min(1)
		.max(constants.agent.selectMediaLimit)
		.default(1)
		.meta({ description: "The most media the person can pick." }),
	contentLocale: z.string().trim().min(1).optional().meta({
		description:
			"Content language for the returned titles, alt text and descriptions; defaults to the CMS content language.",
	}),
});

/** Saved with the interaction, so the admin and the response check use the same limits. */
export const dataSchema = z.object({
	types: z.array(z.enum(mediaTypes)).nullable(),
	max: z.number().int().min(1).max(constants.agent.selectMediaLimit),
	agentKey: z.string(),
	includePersonal: z.boolean(),
	upload: z.boolean(),
}) satisfies z.ZodType<AgentMediaSelectData>;

export const responseSchema = (data: z.output<typeof dataSchema>) =>
	z
		.object({
			mediaIds: z
				.array(z.number().int().positive())
				.min(1)
				.max(data.max)
				.refine((ids) => new Set(ids).size === ids.length),
		})
		.strict() satisfies z.ZodType<AgentMediaSelectResponse>;

export const outputSchema = z.object({
	data: z
		.array(mediaItemSchema)
		.meta({ description: "The media the person picked, in their order." }),
	meta: z
		.object({
			contentLocale: z
				.string()
				.nullable()
				.meta({ description: "Selected content language." }),
		})
		.meta({ description: "Media selection context." }),
});

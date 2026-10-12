import z from "zod";
import constants from "../../../../constants/constants.js";
import type { AgentAudioSettings } from "../../../../types/response.js";

const scriptSchema = z
	.string()
	.trim()
	.min(1)
	.max(constants.media.transcriptMaxLength);
const instructionSchema = z.string().trim().min(1).max(2_000);
const titleSchema = z.string().trim().min(1).max(255);

export const inputSchema = z
	.object({
		script: scriptSchema.meta({
			description:
				"The exact words to speak, written for listening: plain sentences without markdown, links, code or tables. To narrate a document, read it first and adapt its content.",
		}),
		instruction: instructionSchema.optional().meta({
			description:
				"How to deliver the script, such as tone, pacing and emotion. Only some models follow it, so leave it out unless the person asked for a delivery.",
		}),
		title: titleSchema.meta({
			description: "A short title for the saved media, in the CMS language.",
		}),
		library: z.boolean().default(false).meta({
			description:
				"Save the audio to the media library as public media, ready to use in documents, instead of the person's private personal media. Set it when the audio is for a document or field.",
		}),
		skipReview: z.boolean().default(false).meta({
			description:
				"In chats the person checks and can adjust the script, voice and model before generating. Only skip that when they asked you to go ahead without checking. Routines never ask.",
		}),
	})
	.strict();

/** Reviewed settings returned by the audio widget, which is also given them to start with. */
export const settingsSchema = z
	.object({
		script: scriptSchema,
		title: titleSchema,
		instruction: instructionSchema.nullable(),
		model: z.string().trim().min(1).max(200).nullable(),
		voice: z.string().trim().min(1).max(200).nullable(),
	})
	.strict() satisfies z.ZodType<AgentAudioSettings>;

export { generatedMediaOutputSchema as outputSchema } from "../../helpers/generated-media-schema.js";

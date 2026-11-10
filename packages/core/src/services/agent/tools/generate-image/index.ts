import constants from "../../../../constants/constants.js";
import { isAiFeatureEnabled } from "../../../../libs/config/ai-features.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import dedent from "../../../../utils/helpers/dedent.js";
import { builderUpdateToolName } from "../builder-update/constants.js";
import { generateImageToolName } from "./constants.js";
import generateImage from "./handler.js";
import prepareImageSettings from "./prepare.js";
import {
	inputSchema,
	outputSchema,
	settingsDataSchema,
	settingsResponseSchema,
} from "./schema.js";

/** Creates a new image from a text instruction, optionally letting the person check the settings first. */
export const generateImageAgentTool = () =>
	defineTool({
		name: generateImageToolName,
		title: copy("admin:core.tools.media_generate_image.title"),
		description: dedent(`
			Create a new image with Lucid AI from a text instruction, and save it as media. Only use it when the person explicitly asks for an image; never generate one on your own initiative, eg. to fill an empty image field, but suggest it instead.
			The image is shown in the chat and linked to it, so don't preview or link it again.
			When the image is for a document or field, set library and put the image in that field in the same reply, eg. with ${builderUpdateToolName} for the document they have open, rather than asking first.
			Takes up to a few minutes and uses Lucid credits.
		`),
		input: inputSchema,
		output: outputSchema,
		agent: {
			outputVersion: 1,
			permissions: [Permissions.AiImageGenerate],
			capabilities: { media: { generate: { image: true } } },
			available: ({ config, aiAccess }) =>
				isAiFeatureEnabled(config, "imageGeneration", aiAccess),
			interaction: {
				key: constants.agent.widgets.imageSettings,
				version: 1,
				data: settingsDataSchema,
				response: () => settingsResponseSchema,
				skippable: true,
				prepare: async ({ input }) => {
					const result = await prepareImageSettings({
						input,
						editMediaId: null,
					});
					if (result.error) throw new LucidError(result.error);
					return result.data;
				},
			},
		},
		handler: async ({ context, input, execution, response }) => {
			const result = await generateImage(context, {
				toolName: generateImageToolName,
				input,
				settings: response,
				editMediaId: null,
				execution,
				summary: copy("admin:core.tools.media_generate_image.summary"),
			});
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).agent;

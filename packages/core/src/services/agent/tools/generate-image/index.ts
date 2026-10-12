import constants from "../../../../constants/constants.js";
import { isAiFeatureEnabled } from "../../../../libs/config/ai-features.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import dedent from "../../../../utils/helpers/dedent.js";
import { builderUpdateToolName } from "../builder-update/constants.js";
import { generateImageToolName } from "./constants.js";
import generateImage from "./generate-image.js";
import prepareImageSettings from "./prepare.js";
import {
	inputSchema,
	outputSchema,
	settingsDataSchema,
	settingsResponseSchema,
} from "./schema.js";

/** Creates a new image from a text instruction, optionally letting the person check the settings first. */
export const generateImageAgentTool = () =>
	defineAgentTool({
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
		outputVersion: 1,
		permissions: [Permissions.AiImageGenerate],
		capabilities: { imageGeneration: true },
		available: ({ config }) => isAiFeatureEnabled(config, "imageGeneration"),
		describe: () => copy("admin:core.tools.media_generate_image.describe"),
		interaction: {
			key: constants.agent.widgets.imageSettings,
			version: 1,
			data: settingsDataSchema,
			response: () => settingsResponseSchema,
			optional: true,
			prepare: ({ context, input }) =>
				prepareImageSettings(context, { input, editMediaId: null }),
		},
		handler: ({ context, input, execution, response }) =>
			generateImage(context, {
				toolName: generateImageToolName,
				input,
				settings: response,
				editMediaId: null,
				execution,
				summary: copy("admin:core.tools.media_generate_image.summary"),
			}),
	});

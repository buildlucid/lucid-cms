import constants from "../../../../constants/constants.js";
import { isAiFeatureEnabled } from "../../../../libs/config/ai-features.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import dedent from "../../../../utils/helpers/dedent.js";
import { editImageToolName } from "../generate-image/constants.js";
import generateImage from "../generate-image/generate-image.js";
import prepareImageSettings from "../generate-image/prepare.js";
import {
	outputSchema,
	settingsDataSchema,
	settingsResponseSchema,
} from "../generate-image/schema.js";
import checkSource from "./check-source.js";
import { inputSchema } from "./schema.js";

/** Creates an edited copy of a Lucid image, preserving the original. */
export const editImageAgentTool = () =>
	defineAgentTool({
		name: editImageToolName,
		title: copy("admin:core.tools.media_edit_image.title"),
		description: dedent(`
			Change an existing Lucid image with Lucid AI, saving the result as new media and leaving the original as it was. Only use it when the person asks you to change a specific image; to create a new image, use media_generate_image instead.
			Write the instruction, title and alt text about what the image really shows. If you haven't seen it described, look at it with your media analysis tool first.
			The image is shown in the chat and linked to it, so don't preview or link it again.
			Takes up to a few minutes and uses Lucid credits.
		`),
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [Permissions.AiImageGenerate],
		capabilities: { imageGeneration: true },
		available: ({ config }) => isAiFeatureEnabled(config, "imageGeneration"),
		describe: (input) =>
			copy("admin:core.tools.media_edit_image.describe", {
				data: { id: input.mediaId },
			}),
		interaction: {
			key: constants.agent.widgets.imageSettings,
			version: 1,
			data: settingsDataSchema,
			response: () => settingsResponseSchema,
			optional: true,
			prepare: async ({ context, input, execution }) => {
				const source = await checkSource(context, {
					mediaId: input.mediaId,
					execution,
				});
				if (source.error) return source;

				return prepareImageSettings(context, {
					input,
					editMediaId: input.mediaId,
				});
			},
		},
		handler: async ({ context, input, execution, response }) => {
			const source = await checkSource(context, {
				mediaId: input.mediaId,
				execution,
			});
			if (source.error) return source;

			return generateImage(context, {
				toolName: editImageToolName,
				input,
				settings: response,
				editMediaId: input.mediaId,
				execution,
				summary: copy("admin:core.tools.media_edit_image.summary", {
					data: { id: input.mediaId },
				}),
			});
		},
	});

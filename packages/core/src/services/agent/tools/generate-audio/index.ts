import constants from "../../../../constants/constants.js";
import { isAiFeatureEnabled } from "../../../../libs/config/ai-features.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import dedent from "../../../../utils/helpers/dedent.js";
import { builderUpdateToolName } from "../builder-update/constants.js";
import { generateAudioToolName } from "./constants.js";
import generateAudio from "./generate-audio.js";
import prepareAudioSettings from "./prepare.js";
import { inputSchema, outputSchema, settingsSchema } from "./schema.js";

/** Speaks a script with Lucid AI text to speech, optionally letting the person check the voice and script first. */
export const generateAudioAgentTool = () =>
	defineAgentTool({
		name: generateAudioToolName,
		title: copy("admin:core.tools.media_generate_audio.title"),
		description: dedent(`
			Turn a script into spoken audio with Lucid AI text to speech, and save it as media. Use it when the person asks for audio, a voiceover or a narration, eg. of the document they have open. Never generate audio on your own initiative; suggest it instead.
			Write the script for listening. To narrate a document, read its content first and adapt it, eg. say headings as sentences and leave out code, tables and links.
			The audio is shown in the chat and linked to it, so don't preview or link it again.
			When the audio is for a document or field, set library and put the audio in that field in the same reply, eg. with ${builderUpdateToolName} for the document they have open, rather than asking first.
			Takes up to a few minutes and uses Lucid credits.
		`),
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [Permissions.AiAudioGenerate],
		capabilities: { audioGeneration: true },
		available: ({ config }) => isAiFeatureEnabled(config, "audioGeneration"),
		describe: () => copy("admin:core.tools.media_generate_audio.describe"),
		interaction: {
			key: constants.agent.widgets.audioSettings,
			version: 1,
			data: settingsSchema,
			response: () => settingsSchema,
			optional: true,
			prepare: ({ context, input }) => prepareAudioSettings(context, { input }),
		},
		handler: ({ context, input, execution, response }) =>
			generateAudio(context, { input, settings: response, execution }),
	});

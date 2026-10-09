import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import selectMedia from "./handler.js";
import prepareSelectMedia from "./prepare.js";
import {
	dataSchema,
	inputSchema,
	outputSchema,
	responseSchema,
} from "./schema.js";

const name = "media_select" satisfies AgentLucidToolName;

export const selectMediaAgentTool = () =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.media_select.title"),
		description:
			"Ask the person to pick media from the library or upload new files, and pause until they choose. Use it when the person should decide which media to use, eg. a hero image. The picked media is linked to this chat.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaRead],
		readOnly: true,
		interaction: {
			key: constants.agent.widgets.tools.media_select,
			version: 1,
			data: dataSchema,
			response: responseSchema,
			prepare: ({ context, input, execution }) =>
				prepareSelectMedia(context, { input, execution }),
		},
		handler: async ({ context, input, execution, data, response }) => {
			const result = await selectMedia(context, {
				input,
				data,
				response,
				authority: execution.authority,
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) return result;

			const count = result.data.output.data.length;
			return {
				error: undefined,
				data: {
					...result.data,
					summary: copy(
						count === 1
							? "admin:core.tools.media_select.summary.one"
							: "admin:core.tools.media_select.summary",
						{ data: { count } },
					),
				},
			};
		},
	});

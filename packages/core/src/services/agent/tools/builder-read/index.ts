import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import {
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../schemas/agent-screen.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import screenCall from "../../helpers/builder/screen-call.js";
import { builderReadToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const title = copy("admin:core.tools.lucid_builder_read.title");

/** Reads the open builder's content, including unsaved changes. */
export const builderReadAgentTool = () =>
	defineAgentTool({
		name: builderReadToolName,
		title,
		description:
			"Read the document the person has open in the document builder, as they see it, including changes they haven't saved. Returns fields and bricks in the shape documents_get returns, with the refs lucid_builder_update needs, and any validation errors.",
		input: inputSchema,
		output: outputSchema,
		//* collection read access is checked against the open screen when the call runs
		permissions: [],
		readOnly: true,
		available: ({ screen }) => screen === "document",
		interaction: {
			key: constants.agent.widgets.screen,
			version: 1,
			data: agentScreenCallSchema,
			response: () => agentScreenResponseSchema,
			prepare: async ({ context, execution }) => {
				const resolved = resolveBuilderScreen(context, execution);
				if (resolved.error) return resolved;

				return {
					error: undefined,
					data: screenCall(context, {
						title,
						call: { action: "read", screen: resolved.data.screen },
					}),
				};
			},
		},
		handler: ({ context, input, execution, response }) =>
			handler(context, { input, execution, response }),
	});

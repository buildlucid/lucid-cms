import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import {
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../schemas/agent-screen.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import screenCall from "../../helpers/builder/screen-call.js";
import screenUnavailableMessage from "../../helpers/builder/screen-unavailable-message.js";
import { builderFocusToolName } from "./constants.js";
import { inputSchema, outputSchema } from "./schema.js";

const title = copy("admin:core.tools.lucid_builder_focus.title");

/** Scrolls the person's document builder to a field or brick and highlights it. */
export const builderFocusAgentTool = () =>
	defineAgentTool({
		name: builderFocusToolName,
		title,
		description:
			"Scroll the person's document builder to a field or brick and highlight it, eg. to show them one you are asking about.",
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
			prepare: async ({ context, input, execution }) => {
				const resolved = resolveBuilderScreen(context, execution);
				if (resolved.error) return resolved;

				return {
					error: undefined,
					data: screenCall(context, {
						title,
						call: {
							action: "focus",
							screen: resolved.data.screen,
							target: input,
						},
					}),
				};
			},
		},
		handler: async ({ response }) => {
			if (response.status === "unavailable") {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: screenUnavailableMessage(response),
					},
				};
			}

			return {
				error: undefined,
				data: {
					output: { shown: true },
					summary: copy("admin:core.tools.lucid_builder_focus.summary"),
				},
			};
		},
	});

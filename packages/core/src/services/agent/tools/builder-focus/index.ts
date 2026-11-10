import constants from "../../../../constants/constants.js";
import {
	agentBuilderFocusSchema,
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../libs/agent/screen.js";
import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import screenCall from "../../helpers/builder/screen-call.js";
import screenUnavailableMessage from "../../helpers/builder/screen-unavailable-message.js";
import { builderFocusToolName } from "./constants.js";
import { outputSchema } from "./schema.js";

const title = copy("admin:core.tools.lucid_builder_focus.title");

/** Scrolls the person's document builder to a field or brick and highlights it. */
export const builderFocusAgentTool = () =>
	defineTool({
		name: builderFocusToolName,
		title,
		description:
			"Scroll the person's document builder to a field or brick and highlight it, eg. to show them one you are asking about.",
		input: agentBuilderFocusSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			//* collection read access is checked against the open screen when the call runs
			permissions: [],
			available: ({ screen }) => screen === "document",
			interaction: {
				key: constants.agent.widgets.screen,
				version: 1,
				data: agentScreenCallSchema,
				response: () => agentScreenResponseSchema,
				prepare: async ({ context, input, execution }) => {
					const resolved = resolveBuilderScreen(context, execution);
					if (resolved.error) throw new LucidError(resolved.error);

					return screenCall({
						title,
						call: {
							action: "focus",
							screen: resolved.data.screen,
							focus: input,
						},
					});
				},
			},
		},
		handler: async ({ response }) => {
			if (response.status === "unavailable") {
				throw new LucidError({
					type: "basic",
					status: 409,
					message: screenUnavailableMessage(response),
				});
			}

			return {
				output: { shown: true },
				summary: copy("admin:core.tools.lucid_builder_focus.summary"),
			};
		},
	}).agent;

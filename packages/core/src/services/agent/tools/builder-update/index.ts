import constants from "../../../../constants/constants.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import {
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../schemas/agent-screen.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import screenCall from "../../helpers/builder/screen-call.js";
import { builderUpdateTitle, builderUpdateToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Applies changed content to the open builder as unsaved edits. */
export const builderUpdateAgentTool = () =>
	defineAgentTool({
		name: builderUpdateToolName,
		title: builderUpdateTitle,
		description:
			"Change the document the person has open in the document builder, sending only what changes, in the shape documents_update takes. Read it with lucid_builder_read first and reuse its refs. Changes show in the builder as unsaved edits for them to review and save, so nothing is saved for them. Returns any validation errors the changed content has, so fix those before finishing. It is refused when they edited the same fields or bricks while it applied, so read it again and retry.",
		input: inputSchema,
		output: outputSchema,
		//* collection read access is checked against the open screen when the call runs
		permissions: [],
		//* Confirm-all mode asks before changing unsaved content; default mode leaves review to the person.
		readOnly: false,
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
						title: builderUpdateTitle,
						call: { action: "read", screen: resolved.data.screen },
					}),
				};
			},
		},
		handler: ({ context, input, execution, data, response }) =>
			handler(context, { input, execution, call: data, response }),
	});

import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import { subagentReadToolName } from "../subagent-read/constants.js";
import { subagentWaitToolName } from "./constants.js";
import collect from "./handler.js";
import prepare from "./prepare.js";
import {
	inputSchema,
	outputSchema,
	waitDataSchema,
	waitResponseSchema,
} from "./schema.js";

/**
 * Pauses the run until its sub-agents finish, then returns their replies.
 * @remarks The pause is a hidden interaction the runner answers when a sub-agent finishes, so the run holds no worker while it waits.
 */
export const subagentWaitAgentTool = () =>
	defineAgentTool({
		name: subagentWaitToolName,
		title: copy("admin:core.tools.lucid_subagent_wait.title"),
		description: `Wait for your sub-agents to finish, then get each one's status and final reply. Long replies are shortened; read the rest with ${subagentReadToolName}. A sub-agent waiting on the person's confirmation still counts as working. If the person sends a message while you wait, the wait ends early and the sub-agents keep working.`,
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		//* its only write marks results as heard, which is safe to repeat
		readOnly: true,
		available: ({ mode }) => mode !== "subagent",
		interaction: {
			key: constants.agent.widgets.subagentWait,
			version: 1,
			data: waitDataSchema,
			response: () => waitResponseSchema,
			prepare: async ({ context, input, execution }) => {
				const result = await prepare(context, { input, execution });
				if (result.error) throw new LucidError(result.error);
				return result.data;
			},
		},
		handler: async ({ context, execution, data }) => {
			const result = await collect(context, { execution, wait: data });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	});

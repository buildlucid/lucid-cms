import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { subagentWaitToolName } from "../subagent-wait/constants.js";
import { subagentMessageToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Redirects a working sub-agent, or follows up with one that has finished. */
export const subagentMessageAgentTool = () =>
	defineAgentTool({
		name: subagentMessageToolName,
		title: copy("admin:core.tools.lucid_subagent_message.title"),
		description: `Send a message to one of your sub-agents. While it works, the message redirects it before its next step. Once it has finished, the message starts a follow-up in its chat, which keeps what it did before. Then use ${subagentWaitToolName} for its reply.`,
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		available: ({ mode }) => mode !== "subagent",
		handler: ({ context, input, execution }) =>
			serviceWrapper(handler, { transaction: true })(context, {
				input,
				execution,
			}),
	});

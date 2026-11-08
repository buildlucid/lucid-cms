import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import dedent from "../../../../utils/helpers/dedent.js";
import { subagentAgentsToolName } from "../subagent-agents/constants.js";
import { subagentMessageToolName } from "../subagent-message/constants.js";
import { subagentWaitToolName } from "../subagent-wait/constants.js";
import { subagentStartToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Starts another agent as a sub-agent working on a task in its own chat. */
export const subagentStartAgentTool = (options: {
	agents?: readonly string[];
}) =>
	defineAgentTool({
		name: subagentStartToolName,
		title: copy("admin:core.tools.lucid_subagent_start.title"),
		description: dedent(`
			Start another agent as a sub-agent, working on a task in its own chat while you carry on. Use sub-agents for independent work that can run in parallel, or that suits another agent's tools, and split large jobs between several.
			The sub-agent can't see this chat or ask the person questions, so give it everything it needs in the task. It acts for the same person, with the same permissions.
			Use ${subagentAgentsToolName} to choose an agent and model, ${subagentWaitToolName} to wait for results, and ${subagentMessageToolName} to redirect or follow up. If you end your reply while sub-agents are still working, you wait for them and carry on with their results.
		`),
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		available: ({ mode }) => mode !== "subagent",
		describe: ({ input }) =>
			copy("admin:core.tools.lucid_subagent_start.describe", {
				data: { agent: input.agentKey },
			}),
		handler: ({ context, input, execution }) =>
			handler(context, { input, execution, agents: options.agents }),
	});

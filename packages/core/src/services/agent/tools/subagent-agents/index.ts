import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { subagentStartToolName } from "../subagent-start/constants.js";
import { subagentAgentsToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Lists the agents this agent can start as sub-agents, and their models. */
export const subagentAgentsAgentTool = (options: {
	agents?: readonly string[];
}) =>
	defineAgentTool({
		name: subagentAgentsToolName,
		title: copy("admin:core.tools.lucid_subagent_agents.title"),
		description: `List the agents you can start as sub-agents, with what each is for and the models and reasoning efforts it can use. Check it before ${subagentStartToolName} when choosing an agent or a model.`,
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		available: ({ mode }) => mode !== "subagent",
		handler: ({ context, execution }) =>
			handler(context, { execution, agents: options.agents }),
	});

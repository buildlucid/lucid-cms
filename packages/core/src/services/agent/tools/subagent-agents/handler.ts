import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveModel from "../../helpers/resolve-model.js";
import getStartableAgents from "../../helpers/subagents/get-startable-agents.js";
import type { outputSchema } from "./schema.js";

/** Lists the agents the run can start, each with the models it offers and its default. */
const handler: ServiceFn<
	[{ execution: AgentToolExecution; agents?: readonly string[] }],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, input) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const agents = [];

	for (const agent of getStartableAgents(context, {
		authority: input.execution.authority,
		agents: input.agents,
	})) {
		const models = await resolveModel(context, { agentKey: agent.key });
		if (models.error) return models;

		agents.push({
			key: agent.key,
			name: translate(agent.name),
			description: translate(agent.description),
			defaultModel: models.data.selection,
			models: models.data.models.map((model) => ({
				id: model.id,
				name: model.name,
				description: model.description,
				reasoningEfforts: model.reasoningEfforts,
			})),
		});
	}

	return {
		error: undefined,
		data: {
			output: { agents },
			summary: copy(
				agents.length === 1
					? "admin:core.tools.lucid_subagent_agents.summary.one"
					: "admin:core.tools.lucid_subagent_agents.summary",
				{ data: { count: agents.length } },
			),
		},
	};
};

export default handler;

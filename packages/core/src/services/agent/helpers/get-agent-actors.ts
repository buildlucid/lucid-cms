import formatter from "../../../libs/formatters/index.js";
import { AgentAttributionsRepository } from "../../../libs/repositories/index.js";
import type { AgentActor } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Resolves agent details by run ID for responses, omitting IDs with no stored attribution. */
const getAgentActors: ServiceFn<
	[{ runIds: Array<string | null | undefined> }],
	Map<string, AgentActor>
> = async (context, data) => {
	const runIds = [
		...new Set(
			data.runIds.filter((id): id is string => typeof id === "string"),
		),
	];
	if (runIds.length === 0) return { error: undefined, data: new Map() };

	const AgentAttributions = new AgentAttributionsRepository(context.db);
	const attributionsRes = await AgentAttributions.selectMultipleByRun(runIds);
	if (attributionsRes.error) return attributionsRes;

	//* disabled agents keep their name, so past work still reads the same
	const definitions = context.config.ai.agents.definitions;
	return {
		error: undefined,
		data: new Map(
			attributionsRes.data.map((attribution) => [
				attribution.run_id,
				{
					key: attribution.agent_key,
					system: formatter.formatBoolean(attribution.system),
					name:
						definitions.find((agent) => agent.key === attribution.agent_key)
							?.name ?? attribution.agent_key,
					conversationId: attribution.conversation_id,
				},
			]),
		),
	};
};

export default getAgentActors;

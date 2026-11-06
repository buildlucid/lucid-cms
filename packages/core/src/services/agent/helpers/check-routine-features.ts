import { getAgents } from "../../../libs/agent/registry.js";
import { isAiFeatureEnabled } from "../../../libs/config/ai-features.js";
import type { AgentRoutineSource } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAiAccess from "../../connection/get-ai-access.js";

/**
 * Whether the AI features a code routine needs are on, in the config and the organisation's AI
 * access. Admin routines need none.
 */
const checkRoutineFeatures: ServiceFn<
	[{ agentKey: string; key: string | null; source: AgentRoutineSource }],
	boolean
> = async (context, input) => {
	if (input.source !== "code") return { error: undefined, data: true };

	const features =
		getAgents(context.config)
			.find((agent) => agent.key === input.agentKey)
			?.routines.find((routine) => routine.key === input.key)?.features ?? [];
	if (features.length === 0) return { error: undefined, data: true };

	const aiAccess = await getAiAccess(context, {});
	if (aiAccess.error) return aiAccess;

	return {
		error: undefined,
		data: features.every((feature) =>
			isAiFeatureEnabled(context.config, feature, aiAccess.data),
		),
	};
};

export default checkRoutineFeatures;

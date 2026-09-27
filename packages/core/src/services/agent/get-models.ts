import { copy } from "../../libs/i18n/index.js";
import type { AiModelCatalog } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import resolveModel from "./helpers/resolve-model.js";

/** Returns the models an agent offers, and the default for a new chat or a routine's runs. */
const getModels: ServiceFn<
	[{ agentKey: string; userId: number; routineId?: string }],
	AiModelCatalog
> = async (context, input) => {
	if (input.routineId) {
		const routine = await getAccessibleRoutine(context, {
			id: input.routineId,
			userId: input.userId,
		});
		if (routine.error) return routine;
		if (routine.data.agent_key !== input.agentKey) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 404,
					message: copy("server:agent.routine.not.found"),
				},
			};
		}
	} else {
		const access = await checkAgentAccess(context, { ...input, level: "use" });
		if (access.error) return access;
	}

	const result = await resolveModel(context, input);
	if (result.error) return result;

	return {
		data: { models: result.data.models, default: result.data.selection },
		error: undefined,
	};
};
export default getModels;

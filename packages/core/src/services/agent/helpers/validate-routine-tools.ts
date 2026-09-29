import type { RoutineTools } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";
import resolveRunSetup from "./resolve-run-setup.js";

const validateRoutineTools: ServiceFn<
	[{ agentKey: string; userId: number; tools: Readonly<RoutineTools> }],
	undefined
> = async (context, input) => {
	const names = Object.keys(input.tools);
	if (!names.length) return { error: undefined, data: undefined };

	const access = await checkAgentAccess(context, {
		agentKey: input.agentKey,
		userId: input.userId,
		level: "use",
	});
	if (access.error) return access;

	const { tools } = resolveRunSetup(context, {
		...access.data,
		mode: "routine",
		hasHistory: false,
	});
	if (names.some((name) => !tools.some((tool) => tool.name === name))) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.tools.invalid"),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default validateRoutineTools;

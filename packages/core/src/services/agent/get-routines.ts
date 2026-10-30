import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasPermission from "../../libs/permission/has-permission.js";
import {
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleRoutinesQueryParams } from "../../schemas/agent.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";
import resolveUserAccess from "../users/resolve-access.js";
import getRoutineTools from "./helpers/get-routine-tools.js";
import resolveAgentAccess from "./helpers/resolve-agent-access.js";

/** Lists routines allowed by ownership, code management or global oversight, including owners, tools and last runs. */
const getRoutines: ServiceFn<
	[{ userId: number; query: GetMultipleRoutinesQueryParams }],
	{ data: AgentRoutine[]; count: number }
> = async (context, input) => {
	const access = await resolveAgentAccess(context, { userId: input.userId });
	if (access.error) return access;

	const user = await resolveUserAccess(context, { userId: input.userId });
	if (user.error) return user;

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const routines = await AgentRoutines.selectMultipleFilteredForAccess({
		userId: input.userId,
		agentKeys: access.data,
		manageAll: hasPermission(user.data, Permissions.AiRoutinesManageAll),
		queryParams: input.query,
	});
	if (routines.error) return routines;

	const owners = await getDisplayUsers(context, {
		ids: routines.data[0].map((routine) => routine.user_id),
	});
	if (owners.error) return owners;

	const AgentRuns = new AgentRunsRepository(context.db);

	const lastRuns = await AgentRuns.selectLatestForRoutines(
		routines.data[0].map((routine) => routine.id),
	);
	if (lastRuns.error) return lastRuns;

	const tools = await getRoutineTools(
		context,
		routines.data[0].map((routine) => routine.id),
	);
	if (tools.error) return tools;

	return {
		error: undefined,
		data: {
			data: routines.data[0].map((routine) =>
				agentFormatter.formatRoutine({
					routine,
					//* keep access labels aligned with getAccessibleRoutine
					access:
						routine.source === "code"
							? "manager"
							: routine.user_id === input.userId &&
								  access.data["manage-own-routines"].includes(routine.agent_key)
								? "owner"
								: "oversight",
					toolSettings: tools.data[routine.id] ?? {},
					lastRun: lastRuns.data.find((run) => run.routine_id === routine.id),
					owner:
						routine.user_id === null
							? undefined
							: owners.data.get(routine.user_id),
				}),
			),
			count: formatter.parseCount(routines.data[1]?.count),
		},
	};
};

export default getRoutines;

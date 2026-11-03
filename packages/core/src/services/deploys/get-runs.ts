import { getViewableDeploys } from "../../libs/deploys/registry.js";
import formatter, { deploysFormatter } from "../../libs/formatters/index.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { GetRunsQueryParams } from "../../schemas/deploys.js";
import type { LucidActor } from "../../types/hono.js";
import type { DeployRun } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAgentActors from "../agent/helpers/get-agent-actors.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";

/** Lists runs of the deploys the actor can view, newest first unless the query sorts them. */
const getRuns: ServiceFn<
	[{ query: GetRunsQueryParams; actor: LucidActor }],
	{ data: DeployRun[]; count: number }
> = async (context, data) => {
	const deployKeys = getViewableDeploys(context.config, data.actor).map(
		(deploy) => deploy.key,
	);
	if (deployKeys.length === 0) {
		return { error: undefined, data: { data: [], count: 0 } };
	}

	const DeployRuns = new DeployRunsRepository(context.db);

	const runs = await DeployRuns.selectMultipleFiltered({
		select: [
			"id",
			"deploy_key",
			"status",
			"source",
			"trigger_count",
			"started_by_user_id",
			"agent_run_id",
			"url",
			"message",
			"created_at",
			"started_at",
			"finished_at",
		],
		where: [{ key: "deploy_key", operator: "in", value: deployKeys }],
		queryParams: {
			...data.query,
			sort: data.query.sort ?? [{ key: "createdAt", direction: "desc" }],
		},
		validation: { enabled: true },
	});
	if (runs.error) return runs;

	const users = await getDisplayUsers(context, {
		ids: runs.data[0].map((run) => run.started_by_user_id),
	});
	if (users.error) return users;

	const agents = await getAgentActors(context, {
		runIds: runs.data[0].map((run) => run.agent_run_id),
	});
	if (agents.error) return agents;

	return {
		error: undefined,
		data: {
			data: runs.data[0].map((run) =>
				deploysFormatter.formatRun({
					run,
					users: users.data,
					agents: agents.data,
				}),
			),
			count: formatter.parseCount(runs.data[1]?.count),
		},
	};
};

export default getRuns;

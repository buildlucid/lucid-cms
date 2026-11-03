import { Cron } from "croner";
import constants from "../../constants/constants.js";
import { getDeployWebhookUrl } from "../../libs/deploys/callback.js";
import { getViewableDeploys } from "../../libs/deploys/registry.js";
import formatter, { deploysFormatter } from "../../libs/formatters/index.js";
import {
	DeployOverridesRepository,
	DeployRunsRepository,
	DeployTriggersRepository,
} from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { Deploy } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAgentActors from "../agent/helpers/get-agent-actors.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";

/** Returns the deploys the actor can view, with their on/off state, waiting triggers, current runs and recent history. */
const getMultiple: ServiceFn<[{ actor: LucidActor }], Deploy[]> = async (
	context,
	data,
) => {
	const viewable = getViewableDeploys(context.config, data.actor);
	const deployKeys = viewable.map((deploy) => deploy.key);
	if (deployKeys.length === 0) return { error: undefined, data: [] };

	const DeployOverrides = new DeployOverridesRepository(context.db);
	const DeployTriggers = new DeployTriggersRepository(context.db);
	const DeployRuns = new DeployRunsRepository(context.db);

	const [overrides, pending, active, recent] = await Promise.all([
		DeployOverrides.selectMultiple({
			select: ["deploy_key", "disabled_at", "disabled_by_user_id"],
			where: [{ key: "deploy_key", operator: "in", value: deployKeys }],
		}),
		DeployTriggers.selectPending({ deployKeys }),
		DeployRuns.selectMultiple({
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
			where: [
				{ key: "deploy_key", operator: "in", value: deployKeys },
				{
					key: "status",
					operator: "in",
					value: ["queued", "starting", "running"],
				},
			],
		}),
		DeployRuns.selectRecent({
			deployKeys,
			statuses: ["succeeded", "failed", "triggered", "timed-out", "cancelled"],
			limit: constants.deploys.recentRuns,
		}),
	]);
	if (overrides.error) return overrides;
	if (pending.error) return pending;
	if (active.error) return active;
	if (recent.error) return recent;

	const runs = [...(active.data ?? []), ...recent.data];
	const users = await getDisplayUsers(context, {
		ids: [
			...runs.map((run) => run.started_by_user_id),
			...(overrides.data ?? []).map((override) => override.disabled_by_user_id),
		],
	});
	if (users.error) return users;

	const agents = await getAgentActors(context, {
		runIds: runs.map((run) => run.agent_run_id),
	});
	if (agents.error) return agents;

	return {
		error: undefined,
		data: viewable.map((deploy) => {
			const override =
				overrides.data?.find((item) => item.deploy_key === deploy.key) ?? null;
			const waiting = pending.data.find(
				(item) => item.deploy_key === deploy.key,
			);
			const deployRuns = active.data?.filter(
				(run) => run.deploy_key === deploy.key,
			);
			const readyAt = waiting
				? Math.min(
						new Date(formatter.formatDate(waiting.last_at)).getTime() +
							deploy.debounceSeconds * 1000,
						new Date(formatter.formatDate(waiting.first_at)).getTime() +
							deploy.maxWaitSeconds * 1000,
					)
				: null;

			return deploysFormatter.formatDeploy({
				deploy,
				translate: context.translate,
				override,
				pending:
					waiting && readyAt !== null
						? {
								count: Number(waiting.count),
								readyAt: new Date(readyAt).toISOString(),
							}
						: null,
				nextRunAt:
					deploy.schedule && !override
						? (new Cron(deploy.schedule, { timezone: "UTC" })
								.nextRun()
								?.toISOString() ?? null)
						: null,
				webhookUrl: deploy.provider.webhook
					? getDeployWebhookUrl(context, deploy.key)
					: null,
				runs: {
					queued: deployRuns?.find((run) => run.status === "queued") ?? null,
					running: deployRuns?.find((run) => run.status !== "queued") ?? null,
					recent: recent.data.filter((run) => run.deploy_key === deploy.key),
				},
				users: users.data,
				agents: agents.data,
			});
		}),
	};
};

export default getMultiple;

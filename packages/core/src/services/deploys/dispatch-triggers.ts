import { getDeploy } from "../../libs/deploys/registry.js";
import formatter from "../../libs/formatters/index.js";
import {
	DeployOverridesRepository,
	DeployRunsRepository,
	DeployTriggersRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import startQueuedRun from "./helpers/start-queued-run.js";

/** Queues triggers after debounce or maximum wait. Drops triggers for disabled or removed deploys. */
const dispatchTriggers: ServiceFn<[], undefined> = async (context) => {
	const DeployTriggers = new DeployTriggersRepository(context.db);
	const DeployOverrides = new DeployOverridesRepository(context.db);

	const pending = await DeployTriggers.selectPending();
	if (pending.error) return pending;
	if (pending.data.length === 0) return { error: undefined, data: undefined };

	const overrides = await DeployOverrides.selectMultiple({
		select: ["deploy_key"],
	});
	if (overrides.error) return overrides;
	const disabled = new Set(overrides.data?.map((item) => item.deploy_key));

	const now = Date.now();
	for (const group of pending.data) {
		const deploy = getDeploy(context.config, group.deploy_key);
		if (!deploy || disabled.has(group.deploy_key)) {
			const dropped = await DeployTriggers.claimThrough({
				deployKey: group.deploy_key,
				lastId: Number(group.last_id),
			});
			if (dropped.error) return dropped;
			continue;
		}

		const quietAt =
			new Date(formatter.formatDate(group.last_at)).getTime() +
			deploy.debounceSeconds * 1000;
		const waitedAt =
			new Date(formatter.formatDate(group.first_at)).getTime() +
			deploy.maxWaitSeconds * 1000;
		if (Math.min(quietAt, waitedAt) > now) continue;

		const queued = await withTransaction(context, async (context) => {
			const DeployTriggers = new DeployTriggersRepository(context.db);
			const DeployRuns = new DeployRunsRepository(context.db);

			//* a manual run may have claimed these triggers since they were read
			const claimed = await DeployTriggers.claimThrough({
				deployKey: deploy.key,
				lastId: Number(group.last_id),
			});
			if (claimed.error) return claimed;
			if (claimed.data.length === 0) {
				return { error: undefined, data: undefined };
			}

			const run = await DeployRuns.upsertQueued({
				deployKey: deploy.key,
				source: "trigger",
				triggerCount: claimed.data.length,
				startedByUserId: null,
				agentRunId: null,
			});
			if (run.error) return run;

			return startQueuedRun(context, { deploy });
		});
		if (queued.error) return queued;
	}

	return { error: undefined, data: undefined };
};

export default dispatchTriggers;

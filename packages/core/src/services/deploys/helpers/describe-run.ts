import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { DeployRunsRepository } from "../../../libs/repositories/index.js";
import type { DeployRunSource } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAgentActors from "../../agent/helpers/get-agent-actors.js";
import getDisplayUsers from "../../users/helpers/get-display-users.js";

const sentences = {
	succeeded: "server:core.notifications.deploys.detail.succeeded",
	failed: "server:core.notifications.deploys.detail.failed",
	"timed-out": "server:core.notifications.deploys.detail.timed-out",
} as const;

/** "1m 52s", or "1h 2m" for long runs. */
const formatRunDuration = (ms: number) => {
	const seconds = Math.max(1, Math.round(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** What started the run, such as "Started by William Yallop" or "Triggered by 3 changes". */
const startedBy = (props: {
	source: DeployRunSource;
	triggerCount: number;
	person: string | null;
	agent: string | undefined;
}) => {
	switch (props.source) {
		case "trigger":
			return props.triggerCount === 1
				? copy("server:core.notifications.deploys.started.trigger.one")
				: copy("server:core.notifications.deploys.started.trigger", {
						data: { count: props.triggerCount },
					});
		case "schedule":
			return copy("server:core.notifications.deploys.started.schedule");
		case "toolkit":
			return copy("server:core.notifications.deploys.started.toolkit");
		case "agent":
			if (props.agent) {
				return props.person
					? copy("server:core.notifications.deploys.started.agent", {
							data: { agent: props.agent, person: props.person },
						})
					: copy("server:core.notifications.deploys.started.agent.system", {
							data: { agent: props.agent },
						});
			}
			break;
		case "manual":
			break;
	}
	return props.person
		? copy("server:core.notifications.deploys.started.manual", {
				data: { person: props.person },
			})
		: copy("server:core.notifications.deploys.started.admin");
};

/** Formats the run source and duration for notifications, including host messages for failures. */
const describeRun: ServiceFn<
	[
		{
			runId: number;
			status: keyof typeof sentences;
			message?: string | null;
		},
	],
	string | null
> = async (context, data) => {
	const DeployRuns = new DeployRunsRepository(context.db);

	const run = await DeployRuns.selectSingle({
		select: [
			"source",
			"trigger_count",
			"started_by_user_id",
			"agent_run_id",
			"created_at",
			"started_at",
			"finished_at",
		],
		where: [{ key: "id", operator: "=", value: data.runId }],
	});
	if (run.error) return run;
	if (!run.data) return { error: undefined, data: null };

	const [users, agents] = await Promise.all([
		getDisplayUsers(context, { ids: [run.data.started_by_user_id] }),
		getAgentActors(context, { runIds: [run.data.agent_run_id] }),
	]);
	if (users.error) return users;
	if (agents.error) return agents;

	const user =
		run.data.started_by_user_id !== null
			? users.data.get(run.data.started_by_user_id)
			: undefined;
	const startedAt = Date.parse(
		formatter.formatDate(run.data.started_at ?? run.data.created_at) ?? "",
	);
	const finishedAt =
		Date.parse(formatter.formatDate(run.data.finished_at) ?? "") || Date.now();

	const sentence = context.translate(
		copy(sentences[data.status], {
			data: {
				started: context.translate(
					startedBy({
						source: run.data.source,
						triggerCount: run.data.trigger_count,
						person: user
							? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
								user.username
							: null,
						agent: run.data.agent_run_id
							? agents.data.get(run.data.agent_run_id)?.name
							: undefined,
					}),
				),
				duration: formatRunDuration(
					Number.isNaN(startedAt) ? 0 : finishedAt - startedAt,
				),
			},
		}),
	);

	return {
		error: undefined,
		data: data.message ? `${sentence} ${data.message}` : sentence,
	};
};

export default describeRun;

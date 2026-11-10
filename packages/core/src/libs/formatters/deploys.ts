import type {
	AgentActor,
	Deploy,
	DeployRun,
	UserDisplay,
} from "../../types/response.js";
import type { LucidDeployOverrides } from "../db/tables/deploy-overrides.js";
import type { LucidDeployRuns } from "../db/tables/deploy-runs.js";
import type { Select } from "../db/types.js";
import type { DeployDefinition } from "../deploys/types.js";
import type { Translator } from "../i18n/types.js";
import formatter from "./helpers.js";

type DeployRunPropT = Pick<
	Select<LucidDeployRuns>,
	| "id"
	| "deploy_key"
	| "status"
	| "source"
	| "trigger_count"
	| "started_by_user_id"
	| "agent_run_id"
	| "url"
	| "message"
	| "created_at"
	| "started_at"
	| "finished_at"
>;

const formatRun = (props: {
	run: DeployRunPropT;
	users: Map<number, UserDisplay>;
	agents: Map<string, AgentActor>;
}): DeployRun => ({
	id: props.run.id,
	deployKey: props.run.deploy_key,
	status: props.run.status,
	source: props.run.source,
	triggerCount: props.run.trigger_count,
	startedBy:
		props.run.started_by_user_id !== null
			? (props.users.get(props.run.started_by_user_id) ?? null)
			: null,
	agent:
		props.run.agent_run_id !== null
			? (props.agents.get(props.run.agent_run_id) ?? null)
			: null,
	url: props.run.url,
	message: props.run.message,
	createdAt: formatter.formatDate(props.run.created_at),
	startedAt: formatter.formatDate(props.run.started_at),
	finishedAt: formatter.formatDate(props.run.finished_at),
});

const formatDeploy = (props: {
	deploy: DeployDefinition;
	translate: Translator;
	override: Pick<
		Select<LucidDeployOverrides>,
		"disabled_at" | "disabled_by_user_id"
	> | null;
	pending: Deploy["pending"];
	nextRunAt: string | null;
	webhookUrl: string | null;
	runs: {
		queued: DeployRunPropT | null;
		running: DeployRunPropT | null;
		recent: DeployRunPropT[];
	};
	users: Map<number, UserDisplay>;
	agents: Map<string, AgentActor>;
}): Deploy => ({
	key: props.deploy.key,
	name: props.translate(props.deploy.name),
	description: props.deploy.description
		? props.translate(props.deploy.description)
		: null,
	links: props.deploy.links.map((link) => ({
		label: props.translate(link.label),
		url: link.url,
	})),
	provider: props.deploy.provider.key,
	cancellable: props.deploy.provider.cancel !== undefined,
	enabled: props.override === null,
	disabledAt: formatter.formatDate(props.override?.disabled_at),
	disabledBy:
		props.override?.disabled_by_user_id != null
			? (props.users.get(props.override.disabled_by_user_id) ?? null)
			: null,
	triggers: props.deploy.triggers.map(
		(trigger) => `${trigger.service}.${String(trigger.event)}`,
	),
	schedule: props.deploy.schedule
		? { ...props.deploy.schedule, nextRunAt: props.nextRunAt }
		: null,
	webhookUrl: props.webhookUrl,
	pending: props.pending,
	queuedRun: props.runs.queued
		? formatRun({
				run: props.runs.queued,
				users: props.users,
				agents: props.agents,
			})
		: null,
	runningRun: props.runs.running
		? formatRun({
				run: props.runs.running,
				users: props.users,
				agents: props.agents,
			})
		: null,
	recentRuns: props.runs.recent.map((run) =>
		formatRun({ run, users: props.users, agents: props.agents }),
	),
});

export default {
	formatRun,
	formatDeploy,
};

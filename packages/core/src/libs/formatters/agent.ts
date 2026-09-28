import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidAuth } from "../../types/hono.js";
import type {
	AgentCatalog,
	AgentCompaction,
	AgentContext,
	AgentConversation,
	AgentInput,
	AgentMessage,
	AgentRoutine,
	AgentRun,
	AgentRunOutcome,
	AgentRunStatus,
	AgentUsage,
} from "../../types/response.js";
import { contextLimits } from "../agent/context.js";
import { getAgents } from "../agent/registry.js";
import type { ConversationContext, RoutineTools } from "../agent/types.js";
import { isAiFeatureEnabled } from "../config/ai-features.js";
import type { LucidAgentCompactions } from "../db/tables/agent-compactions.js";
import type { LucidAgentConversations } from "../db/tables/agent-conversations.js";
import type { LucidAgentInputs } from "../db/tables/agent-inputs.js";
import type { LucidAgentMessages } from "../db/tables/agent-messages.js";
import type { LucidAgentRoutines } from "../db/tables/agent-routines.js";
import type { LucidAgentRuns } from "../db/tables/agent-runs.js";
import type { Select } from "../db/types.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import { getAgentPermission } from "../permission/agent-permissions.js";
import hasAccess from "../permission/has-access.js";
import formatter from "./helpers.js";

const formatDefinitions = (props: {
	config: ResolvedLucidConfig;
	authUser: LucidAuth;
	adminTranslations: Record<string, string>;
}): AgentCatalog => {
	const withDefaultMessage = (copy: ResolvedAdminCopy): ResolvedAdminCopy => {
		if (copy.type === "lucid.literal" || copy.defaultMessage !== undefined) {
			return copy;
		}
		const defaultMessage = props.adminTranslations[copy.key];
		return defaultMessage === undefined ? copy : { ...copy, defaultMessage };
	};

	return {
		enabled: isAiFeatureEnabled(props.config, "agents"),
		agents: getAgents(props.config).map((agent) => {
			const canUse = hasAccess({
				user: props.authUser,
				requiredPermissions: [getAgentPermission(agent.key, "use")],
			});
			const canManage = hasAccess({
				user: props.authUser,
				requiredPermissions: [getAgentPermission(agent.key, "manage")],
			});

			return {
				key: agent.key,
				name: agent.name,
				description: agent.description,
				suggestions: canUse
					? agent.suggestions.map((suggestion) => ({
							title: withDefaultMessage(suggestion.title),
							description: withDefaultMessage(suggestion.description),
							message: withDefaultMessage(suggestion.message),
						}))
					: [],
				tools:
					canUse || canManage
						? agent.tools.map((tool) => ({
								name: tool.name,
								title: withDefaultMessage(tool.title),
								requiresApproval: tool.requiresApproval,
								interactive: Boolean(tool.interaction),
								permissions: [...tool.permissions],
							}))
						: [],
			};
		}),
	};
};

type ConversationPropT = Select<LucidAgentConversations> & {
	latest_run_id?: string | null;
	latest_run_status?: AgentRunStatus | null;
	latest_run_outcome?: AgentRunOutcome | null;
	latest_run_error?: string | null;
};
type RunPropT = Pick<
	Select<LucidAgentRuns>,
	| "id"
	| "conversation_id"
	| "routine_id"
	| "status"
	| "outcome"
	| "summary"
	| "error_message"
	| "created_at"
	| "started_at"
	| "finished_at"
>;
type LastRunPropT = Pick<
	Select<LucidAgentRuns>,
	"id" | "conversation_id" | "status" | "outcome" | "created_at"
>;

const emptyUsage: AgentUsage = { creditsCharged: "0", modelCalls: 0 };

/** A conversation is only compacting while a run is active, since a stopped run can leave the status behind. */
const formatContext = (props: {
	context: ConversationContext | null;
	active: boolean;
}): AgentContext | null => {
	if (!props.context) return null;

	const percent = Math.min(
		100,
		Math.ceil((props.context.tokens / props.context.tokenLimit) * 100),
	);
	const status = props.active ? props.context.status : "ready";

	return {
		...props.context,
		status,
		percent,
		compactable: status === "ready" && percent >= contextLimits.suggestAt * 100,
	};
};

const formatConversation = (props: {
	conversation: ConversationPropT;
	compactions?: Pick<Select<LucidAgentCompactions>, "id" | "created_at">[];
}): AgentConversation => ({
	id: props.conversation.id,
	approvalMode: props.conversation.approval_mode,
	modelSelection: props.conversation.model_selection,
	queuePaused: Boolean(props.conversation.queue_paused),
	context: formatContext({
		context: props.conversation.context,
		active: props.conversation.active_run_id !== null,
	}),
	...(props.compactions
		? {
				compactions: props.compactions.map(
					(compaction): AgentCompaction => ({
						id: compaction.id,
						createdAt: formatter.formatDate(compaction.created_at),
					}),
				),
			}
		: {}),
	agentKey: props.conversation.agent_key,
	title: props.conversation.title,
	titleStatus: props.conversation.title_status,
	titleGenerationRequestedAt: formatter.formatDate(
		props.conversation.title_generation_requested_at,
	),
	userId: props.conversation.user_id,
	routineId: props.conversation.routine_id,
	latestRun:
		props.conversation.latest_run_id && props.conversation.latest_run_status
			? {
					id: props.conversation.latest_run_id,
					status: props.conversation.latest_run_status,
					outcome: props.conversation.latest_run_outcome ?? null,
					errorMessage: props.conversation.latest_run_error ?? null,
				}
			: null,
	createdAt: formatter.formatDate(props.conversation.created_at),
	updatedAt: formatter.formatDate(props.conversation.updated_at),
});

/** Only undelivered input is shown, so anything not yet claimed is pending. */
const formatInput = (props: {
	input: Select<LucidAgentInputs>;
}): AgentInput => ({
	id: props.input.id,
	text: props.input.text,
	status: props.input.status === "claimed" ? "claimed" : "pending",
	delivery: props.input.target_run_id
		? { kind: "steer", targetRunId: props.input.target_run_id }
		: { kind: "queue" },
});

const formatMessage = (props: {
	message: Select<LucidAgentMessages>;
}): AgentMessage => ({
	id: props.message.id,
	conversationId: props.message.conversation_id,
	runId: props.message.run_id,
	position: props.message.position,
	role: props.message.role,
	parts: props.message.parts,
	createdAt: formatter.formatDate(props.message.created_at),
});

const formatRun = (props: { run: RunPropT; usage?: AgentUsage }): AgentRun => ({
	id: props.run.id,
	conversationId: props.run.conversation_id,
	routineId: props.run.routine_id,
	status: props.run.status,
	outcome: props.run.outcome,
	summary: props.run.summary,
	errorMessage: props.run.error_message,
	usage: props.usage ?? emptyUsage,
	createdAt: formatter.formatDate(props.run.created_at),
	startedAt: formatter.formatDate(props.run.started_at),
	finishedAt: formatter.formatDate(props.run.finished_at),
});

const formatRoutine = (props: {
	routine: Select<LucidAgentRoutines>;
	tools: RoutineTools;
	lastRun?: LastRunPropT;
}): AgentRoutine => ({
	id: props.routine.id,
	agentKey: props.routine.agent_key,
	key: props.routine.key,
	source: props.routine.source,
	name: props.routine.name,
	instructions: props.routine.instructions,
	modelSelection: props.routine.model_selection,
	tools: props.tools,
	cron: props.routine.cron,
	timezone: props.routine.timezone,
	enabled: formatter.formatBoolean(props.routine.enabled),
	nextRunAt: formatter.formatDate(props.routine.next_run_at),
	lastRun: props.lastRun
		? {
				id: props.lastRun.id,
				conversationId: props.lastRun.conversation_id,
				status: props.lastRun.status,
				outcome: props.lastRun.outcome,
				createdAt: formatter.formatDate(props.lastRun.created_at),
			}
		: null,
	createdAt: formatter.formatDate(props.routine.created_at),
	updatedAt: formatter.formatDate(props.routine.updated_at),
});

export default {
	formatDefinitions,
	formatContext,
	formatConversation,
	formatInput,
	formatMessage,
	formatRun,
	formatRoutine,
};

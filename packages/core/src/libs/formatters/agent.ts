import type { AgentInput } from "@lucidcms/types";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidAuth } from "../../types/hono.js";
import type {
	AgentCatalog,
	AgentCompaction,
	AgentContextUsage,
	AgentConversation,
	AgentMessage,
	AgentRoutine,
	AgentRoutineAccess,
	AgentRun,
	AgentRunOutcome,
	AgentRunResultPart,
	AgentRunStatus,
	AgentToolDetails,
	AgentToolSummary,
	AgentUsage,
	AiAccessFeature,
	UserDisplay,
} from "../../types/response.js";
import {
	getAvailableTools,
	getCapabilityProviders,
	summariseCapabilities,
} from "../agent/capabilities.js";
import { contextLimits } from "../agent/context.js";
import { getAgents } from "../agent/registry.js";
import type {
	ConversationContext,
	RoutineToolSettings,
} from "../agent/types.js";
import { isAiFeatureEnabled } from "../config/ai-features.js";
import type { LucidAgentCompactions } from "../db/tables/agent-compactions.js";
import type { LucidAgentConversations } from "../db/tables/agent-conversations.js";
import type { LucidAgentInputs } from "../db/tables/agent-inputs.js";
import type { LucidAgentMessages } from "../db/tables/agent-messages.js";
import type { LucidAgentRoutines } from "../db/tables/agent-routines.js";
import type { LucidAgentRuns } from "../db/tables/agent-runs.js";
import type { Select } from "../db/types.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import { hasAgentPermission } from "../permission/agent-permissions.js";
import formatter from "./helpers.js";

const formatDefinitions = (props: {
	config: ResolvedLucidConfig;
	aiAccess: readonly AiAccessFeature[];
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

	const grant = {
		superAdmin: props.authUser.superAdmin,
		permissions: props.authUser.permissions ?? [],
	};
	const availability = { config: props.config, aiAccess: props.aiAccess };

	return {
		enabled: isAiFeatureEnabled(props.config, "agents"),
		agents: getAgents(props.config).map((agent) => {
			const canChat = hasAgentPermission(grant, agent.key, "chat");

			return {
				key: agent.key,
				name: withDefaultMessage(agent.name),
				description: withDefaultMessage(agent.description),
				features: {
					media: {
						upload: agent.features.media.upload,
						attach: agent.features.media.attach,
						generate: agent.features.media.generate,
					},
					documents: { attach: agent.features.documents.attach },
					requests: { attach: agent.features.requests.attach },
					builder: agent.features.builder,
				},
				capabilities: summariseCapabilities(
					getCapabilityProviders({
						tools: getAvailableTools(agent, grant, availability),
					}),
				),
				suggestions: canChat
					? agent.suggestions.map((suggestion) => ({
							title: withDefaultMessage(suggestion.title),
							description: withDefaultMessage(suggestion.description),
							message: withDefaultMessage(suggestion.message),
						}))
					: [],
				tools: hasAgentPermission(grant, agent.key)
					? agent.tools
							.filter((tool) => tool.available?.(availability) ?? true)
							.map((tool) => ({
								name: tool.name,
								title: withDefaultMessage(tool.title),
								requiresConfirmation: tool.requiresConfirmation,
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

const emptyUsage: AgentUsage = { credits: 0, modelCalls: 0 };

/** A conversation is only compacting while a run is active, since a stopped run can leave the status behind. */
const formatContext = (props: {
	context: ConversationContext | null;
	active: boolean;
}): AgentContextUsage | null => {
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

const titleGenerationWindow = 60_000;

/** Reports a provisional title as generating during the title-generation polling window. */
const formatTitleStatus = (
	conversation: Pick<
		ConversationPropT,
		"title_status" | "title_generation_requested_at"
	>,
): AgentConversation["titleStatus"] => {
	const requestedAt = formatter.formatDate(
		conversation.title_generation_requested_at,
	);
	if (conversation.title_status !== "provisional" || !requestedAt) {
		return conversation.title_status;
	}
	const age = Date.now() - new Date(requestedAt).getTime();
	return age >= 0 && age < titleGenerationWindow ? "generating" : "provisional";
};

const formatConversation = (props: {
	conversation: ConversationPropT;
	compactions?: Pick<Select<LucidAgentCompactions>, "id" | "created_at">[];
}): AgentConversation => ({
	id: props.conversation.id,
	confirmationMode: props.conversation.confirmation_mode,
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
	titleStatus: formatTitleStatus(props.conversation),
	kind: props.conversation.kind,
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
	references: props.input.references,
	screen: props.input.screen,
	status: props.input.status === "claimed" ? "claimed" : "pending",
	delivery: props.input.target_run_id
		? { kind: "steer", targetRunId: props.input.target_run_id }
		: { kind: "queue" },
});

/** Keeps the values the chat renders; full tool inputs and outputs are fetched separately. */
const formatTool = (props: {
	part: AgentToolDetails;
	detailsAvailable?: boolean;
}): AgentToolSummary => {
	const { input: _input, output: _output, ...summary } = props.part;

	return { ...summary, detailsAvailable: props.detailsAvailable ?? true };
};

/** A completed routine run's result. Runs without an outcome, such as chat runs, have none. */
const formatRunResult = (props: {
	run: Pick<Select<LucidAgentRuns>, "outcome" | "summary" | "finished_at">;
}): AgentRunResultPart | undefined => {
	const finishedAt = formatter.formatDate(props.run.finished_at);
	if (!props.run.outcome || props.run.summary === null || !finishedAt) {
		return undefined;
	}

	return {
		type: "run-result",
		outcome: props.run.outcome,
		summary: props.run.summary,
		finishedAt,
	};
};

const formatMessage = (props: {
	message: Omit<Select<LucidAgentMessages>, "execution_version" | "revision">;
	/** Shown on a routine run's request. Only pass it once the run has completed. */
	result?: AgentRunResultPart;
}): AgentMessage => ({
	id: props.message.id,
	conversationId: props.message.conversation_id,
	runId: props.message.run_id,
	position: props.message.position,
	role: props.message.role,
	parts: [
		//* message context is only for the model
		...props.message.parts.flatMap((part) =>
			part.type === "context"
				? []
				: [part.type === "tool" ? formatTool({ part }) : part],
		),
		...(props.result ? [props.result] : []),
	],
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
	access: AgentRoutineAccess;
	toolSettings: RoutineToolSettings;
	lastRun?: LastRunPropT;
	owner?: UserDisplay;
}): AgentRoutine => ({
	id: props.routine.id,
	agentKey: props.routine.agent_key,
	access: props.access,
	owner: props.owner ?? null,
	key: props.routine.key,
	source: props.routine.source,
	name: props.routine.name,
	instructions: props.routine.instructions,
	conversationMode: props.routine.conversation_mode,
	conversationId: props.routine.conversation_id,
	modelSelection: props.routine.model_selection,
	toolSettings: props.toolSettings,
	schedule:
		props.routine.cron && props.routine.timezone
			? { cron: props.routine.cron, timezone: props.routine.timezone }
			: null,
	events: props.routine.events ?? [],
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
	formatRunResult,
	formatTool,
	formatRun,
	formatRoutine,
};

import type {
	AgentConversation,
	AgentMessage,
	AgentRoutine,
	AgentRun,
	AgentRunOutcome,
	AgentRunStatus,
	AgentUsage,
} from "../../types/response.js";
import type { LucidAgentConversations } from "../db/tables/agent-conversations.js";
import type { LucidAgentMessages } from "../db/tables/agent-messages.js";
import type { LucidAgentRoutines } from "../db/tables/agent-routines.js";
import type { LucidAgentRuns } from "../db/tables/agent-runs.js";
import type { Select } from "../db/types.js";
import formatter from "./helpers.js";

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

const formatConversation = (props: {
	conversation: ConversationPropT;
}): AgentConversation => ({
	id: props.conversation.id,
	title: props.conversation.title,
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
	lastRun?: LastRunPropT;
}): AgentRoutine => ({
	id: props.routine.id,
	title: props.routine.title,
	instructions: props.routine.instructions,
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
	formatConversation,
	formatMessage,
	formatRun,
	formatRoutine,
};

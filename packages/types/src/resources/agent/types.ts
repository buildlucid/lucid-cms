/** The lifecycle state of an agent run. */
export type AgentRunStatus =
	| "queued"
	| "running"
	| "waiting"
	| "interrupted"
	| "completed"
	| "failed"
	| "cancelled";

/** How a routine run described its result when it finished. */
export type AgentRunOutcome = "done" | "nothing_to_report" | "needs_review";

export type AgentToolStatus = "pending" | "running" | "complete" | "failed";

/** Approvals gate write tools; questions ask for information. */
export type AgentQuestionKind = "question" | "approval";

/** The answer to an approval question. */
export type AgentApprovalAnswer = "approve" | "deny";

export type AgentMessagePart =
	| { type: "text"; text: string }
	| {
			type: "tool";
			id: string;
			name: string;
			input: Record<string, unknown>;
			output?: unknown;
			status: AgentToolStatus;
	  }
	| {
			type: "question";
			id: string;
			kind: AgentQuestionKind;
			question: string;
			options?: string[];
			answer?: string;
	  }
	| {
			type: "widget";
			key: string;
			version: number;
			data: Record<string, unknown>;
	  };

export interface AgentUsage {
	creditsCharged: string;
	modelCalls: number;
}

/** How much of its model's input limit a conversation's next request uses. Separate from billed usage. */
export interface AgentContext {
	/** The model that last served the conversation. */
	model: string;
	tokens: number;
	tokenLimit: number;
	percent: number;
	status: "ready" | "compacting";
	/** Context is nearly full, so people may compact before it happens automatically. */
	compactable: boolean;
}

/** A point where older context was summarised. The messages themselves are kept. */
export interface AgentCompaction {
	id: string;
	createdAt: string | null;
}

export interface AgentConversation {
	/** Unknown until the conversation's first model request. */
	context: AgentContext | null;
	/** Only included when fetching a single conversation. */
	compactions?: AgentCompaction[];
	id: string;
	title: string;
	userId: number;
	routineId: string | null;
	latestRun: Pick<
		AgentRun,
		"id" | "status" | "outcome" | "errorMessage"
	> | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface AgentMessage {
	id: string;
	conversationId: string;
	runId: string | null;
	position: number;
	role: "user" | "assistant";
	parts: AgentMessagePart[];
	createdAt: string | null;
}

export interface AgentRun {
	id: string;
	conversationId: string;
	routineId: string | null;
	status: AgentRunStatus;
	outcome: AgentRunOutcome | null;
	summary: string | null;
	errorMessage: string | null;
	usage: AgentUsage;
	createdAt: string | null;
	startedAt: string | null;
	finishedAt: string | null;
}

export interface AgentRoutine {
	id: string;
	title: string;
	instructions: string;
	cron: string;
	timezone: string;
	enabled: boolean;
	nextRunAt: string | null;
	lastRun: Pick<
		AgentRun,
		"id" | "conversationId" | "status" | "outcome" | "createdAt"
	> | null;
	createdAt: string | null;
	updatedAt: string | null;
}

/** Server-sent events streamed while a run executes. */
export type AgentStreamEvent =
	| { type: "context"; runId: string; context: AgentContext }
	| { type: "start"; runId: string; messageId: string }
	| { type: "text-delta"; messageId: string; text: string }
	| ({ messageId: string } & Extract<AgentMessagePart, { type: "tool" }>)
	| ({ messageId: string; runId: string } & Extract<
			AgentMessagePart,
			{ type: "question" }
	  >)
	| ({ messageId: string } & Extract<AgentMessagePart, { type: "widget" }>)
	/** A saved reply, sent when watching a run that is executing elsewhere. */
	| { type: "message"; message: AgentMessage }
	| { type: "finish"; runId: string; status: AgentRunStatus }
	| { type: "error"; message: string };

/** An agent registered in config. */
export interface Agent {
	key: string;
	name: string;
	description: string;
}

/** Routines defined in code are synced from config; the rest are created in the admin. */
export type AgentRoutineSource = "code" | "database";

/** Where input sent while the agent is busy goes: after the current run, or into it as a correction. */
export type AgentDelivery =
	| { kind: "queue" }
	| { kind: "steer"; targetRunId: string };

/** Input waiting to be delivered. It stays out of the transcript until its run takes it. */
export interface AgentInput {
	id: string;
	text: string;
	/** `claimed` input is being delivered and can no longer change. */
	status: "pending" | "claimed";
	delivery: AgentDelivery;
}

/** Changes to pending input. Editing takes the text back into the chat box, so it cancels the input. */
export type AgentInputAction =
	| { kind: "cancel"; id: string }
	| { kind: "steer"; id: string; targetRunId: string }
	| { kind: "resume" }
	| { kind: "clear" };

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

export type AgentToolStatus =
	| "pending"
	| "running"
	| "complete"
	| "failed"
	| "skipped";

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
			dismissed?: boolean;
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
	/** Queued messages wait until the user resumes, after a run was stopped or failed. */
	queuePaused: boolean;
	/** Only included when fetching a single conversation. */
	inputs?: AgentInput[];
	/** Unknown until the conversation's first model request. */
	context: AgentContext | null;
	/** Only included when fetching a single conversation. */
	compactions?: AgentCompaction[];
	id: string;
	agentKey: string;
	title: string;
	/** Null for chats started by routines defined in code. */
	userId: number | null;
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
	agentKey: string;
	/** Only set for routines defined in code. */
	key: string | null;
	/** Routines defined in code can only be paused, resumed or run early. */
	source: AgentRoutineSource;
	name: string;
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
	/** The conversation's pending input after it changed. */
	| { type: "inputs"; inputs: AgentInput[]; queuePaused: boolean }
	| { type: "finish"; runId: string; status: AgentRunStatus }
	/** The run a queued message started once this one finished. */
	| { type: "next"; runId: string }
	| { type: "error"; message: string };

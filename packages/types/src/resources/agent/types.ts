import type { AiModelSelection } from "../ai/types.js";
import type { ResolvedAdminCopy } from "../locales/types.js";
import type { Permission } from "../users/types.js";

/** An agent name used in navigation and saved chat labels. */
export type AgentSummary = { key: string; name: string };

/** Agent details available to the current admin user. */
export interface Agent {
	key: string;
	name: string;
	description: string;
	/** Messages offered when starting a chat. Empty without the agent's use permission. */
	suggestions: {
		title: ResolvedAdminCopy;
		description: ResolvedAdminCopy;
		message: ResolvedAdminCopy;
	}[];
	/** Tools available to this agent. Empty when the user can neither use nor manage it. */
	tools: {
		name: string;
		title: ResolvedAdminCopy;
		requiresApproval: boolean;
		interactive: boolean;
		permissions: Permission[];
	}[];
}

/** Configured agents and whether agent chat is enabled. */
export interface AgentCatalog {
	enabled: boolean;
	agents: Agent[];
}

/** Routines defined in code are synced from config; the rest are created in the admin. */
export type AgentRoutineSource = "code" | "database";

/** A routine's settings for one tool. Missing settings use the tool's defaults. */
export type AgentRoutineToolSettings = {
	requiresApproval?: boolean;
};

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

export type AgentTitleStatus = "provisional" | "generated" | "user_set";

export type AgentToolStatus =
	| "pending"
	| "running"
	| "complete"
	| "failed"
	| "skipped";

/** Determines when agent tools pause for approval. Permission checks always apply. */
export type AgentApprovalMode = "confirm-all" | "tool-defaults" | "automatic";

/** Submit or cancel a tool's input request. */
export type AgentInteractionAction = "submit" | "cancel";

export type AgentInteraction = {
	id: string;
	toolCallId: string;
	answeredByUserId?: number;
	title: string;
	placement: "inline" | "composer";
	/** Present when submission also authorises this invocation. */
	approval?: { toolName: string; input: Record<string, unknown> };
} & (
	| { status: "pending" }
	| { status: "answered"; response: Record<string, unknown> }
	| { status: "dismissed" | "cancelled" }
);

export type AgentWidgetPart = {
	type: "widget";
	key: string;
	version: number;
	data: Record<string, unknown>;
	interaction?: AgentInteraction;
};

export type AgentMessagePart =
	| { type: "text"; text: string }
	| {
			type: "tool";
			id: string;
			name: string;
			/** The tool's plain-language name, saved when it was called. */
			title?: ResolvedAdminCopy;
			input: Record<string, unknown>;
			output?: unknown;
			status: AgentToolStatus;
	  }
	| AgentWidgetPart;

export interface AgentUsage {
	creditsCharged: string;
	modelCalls: number;
}

export interface AgentWebSource {
	url: string;
	title: string;
	/** `YYYY-MM-DD`, when the source reports one. */
	publishedAt: string | null;
}

export interface AgentWebSearchOutput {
	results: Array<AgentWebSource & { excerpts: string[] }>;
}

export interface AgentWebFetchOutput extends AgentWebSource {
	content: string;
	/** Full page text from the start, or excerpts chosen for an objective. */
	contentType: "page" | "excerpts";
	truncated: boolean;
}

/** A source used in a conversation, once per page however often it appeared. */
export interface AgentConversationSource {
	url: string;
	title: string;
	/** Whether the agent read the page, rather than only seeing it in search results. */
	read: boolean;
}

export interface AgentConversationDetails {
	usage: AgentUsage & { webCalls: number };
	/** Pages the agent read first, then those only found, each in first-seen order. */
	sources: AgentConversationSource[];
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
	approvalMode: AgentApprovalMode;
	/** The model for the next run. Null uses the routine or agent default. */
	modelSelection: AiModelSelection | null;
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
	titleStatus: AgentTitleStatus;
	titleGenerationRequestedAt: string | null;
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
	/** Null uses the agent's default model. */
	modelSelection: AiModelSelection | null;
	/** Per-tool settings by tool name. Missing tools and settings use the tool's defaults. */
	tools: Record<string, AgentRoutineToolSettings>;
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
	| ({ messageId: string } & Extract<AgentMessagePart, { type: "widget" }>)
	/** A saved reply, sent when watching a run that is executing elsewhere. */
	| { type: "message"; message: AgentMessage }
	/** The conversation's pending input after it changed. */
	| { type: "inputs"; inputs: AgentInput[]; queuePaused: boolean }
	| { type: "finish"; runId: string; status: AgentRunStatus }
	/** The run a queued message started once this one finished. */
	| { type: "next"; runId: string }
	| { type: "error"; message: string };

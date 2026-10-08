import type { AiModelSelection } from "../ai/types.js";
import type { DocumentVersionType } from "../documents/types.js";
import type { ResolvedAdminCopy } from "../locales/types.js";
import type { Permission } from "../users/types.js";

/** A media item or document linked to a chat. */
export type AgentReferenceInput =
	| { type: "media"; mediaId: number }
	| {
			type: "document";
			collectionKey: string;
			documentId: number;
			versionId?: number;
	  };

/** A reference with the details saved when it was attached, so a message keeps what was sent. */
export type AgentReferenceSnapshot = AgentReferenceInput & {
	label: string;
	mimeType?: string;
};

/** How a resource was linked to a chat. */
export type AgentReferenceSource =
	| { type: "message" }
	| { type: "tool"; toolName: string };

/** A linked resource with its current display details. */
export type AgentReference = {
	id: string;
	label: string;
	mimeType?: string;
	previewUrl?: string;
	source: AgentReferenceSource;
	/** Managed by the tool that linked it. People and the agent cannot remove it, only the toolkit can. */
	managed: boolean;
} & (
	| Extract<AgentReferenceInput, { type: "media" }>
	| (Extract<AgentReferenceInput, { type: "document" }> & {
			/** The resolved document version. */
			version?: DocumentVersionType;
	  })
);

/** What an agent can do for the current user, combined from the tools they can use. */
export type AgentCapabilities = {
	/** MIME types of media the agent can analyse. Null when no analysis provider is available. */
	mediaAnalysis: { mimeTypes: string[] } | null;
	/** MIME types of files the agent can read. Null when no file reader is available. */
	fileRead: { mimeTypes: string[] } | null;
	/** Whether the agent can search the public web. */
	webSearch: boolean;
	/** Whether the agent can read public webpages. */
	webRead: boolean;
};

/** An agent name used in navigation and saved chat labels. */
export type AgentSummary = { key: string; name: string };

/** Agent details available to the current admin user. */
export interface Agent {
	key: string;
	name: string;
	description: string;
	/** What the composer offers: personal uploads, existing media and documents. */
	features: {
		media: { upload: boolean; attach: boolean };
		documents: { attach: boolean };
	};
	/** What the agent can do for the current user, such as open attached files or search the web. */
	capabilities: AgentCapabilities;
	/** Messages offered when starting a chat. Empty without the agent's chat permission. */
	suggestions: {
		title: ResolvedAdminCopy;
		description: ResolvedAdminCopy;
		message: ResolvedAdminCopy;
	}[];
	/** Tools available to this agent. Empty without an agent workflow permission. */
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
	references: AgentReferenceInput[];
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

/** Tools the agent runner handles itself. Their names are reserved, so agent tools cannot use them. */
export type AgentRunnerToolName =
	| "lucid_preview_media"
	| "lucid_list_references"
	| "lucid_register_references"
	| "lucid_remove_reference"
	| "lucid_ask_user"
	| "lucid_share_progress"
	| "lucid_read_history"
	| "lucid_load_skill"
	| "lucid_finish_run";

/** Lucid's own agent tools that the admin shows in their own way. */
export type AgentLucidToolName =
	| "web_search"
	| "web_fetch"
	| "media_analyze"
	| "media_read_file";

/** Widgets the runner creates itself, including media galleries, questions and approvals. */
export type AgentRunnerWidgetKey =
	| "lucid-media-preview"
	| "lucid-question"
	| "lucid-tool-approval"
	| "lucid-tool-approval-batch";

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

export type AgentRoutineTrigger = "schedule" | "manual";

export type AgentRoutineConversationMode = "new" | "reuse";

/** A finished routine run's result, read from the run and shown on the card that starts it. */
export type AgentRunResultPart = {
	type: "run-result";
	outcome: AgentRunOutcome;
	summary: string;
	finishedAt: string;
};

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
	/** Exact independent calls covered by a grouped approval. Unselected calls are denied. */
	approvals?: {
		toolCallId: string;
		toolName: string;
		title: string;
		input: Record<string, unknown>;
	}[];
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

/** Full values for one tool call, fetched when its details are opened. */
export type AgentToolDetails = {
	type: "tool";
	id: string;
	name: string;
	title?: ResolvedAdminCopy;
	/** Describes the call while pending or running, then the tool's result copy once complete. Failed and skipped calls keep the earlier copy. Resolved in the admin's current language. */
	summary: ResolvedAdminCopy;
	input: Record<string, unknown>;
	output?: unknown;
	/** The shape version of a built-in tool's output, so older results keep a matching view. */
	outputVersion?: number;
	status: AgentToolStatus;
};

export type AgentToolSummary = Omit<AgentToolDetails, "input" | "output"> & {
	/** False while a newly streamed call has not yet been saved. */
	detailsAvailable: boolean;
};

export type AgentMessagePart =
	| { type: "text"; text: string }
	| { type: "reference"; reference: AgentReferenceSnapshot }
	/** Starts a routine run. The instructions stay here for display, and a text part repeats them only when the agent needs them. */
	| {
			type: "routine";
			name: string;
			instructions: string;
			trigger: AgentRoutineTrigger;
	  }
	| AgentRunResultPart
	| AgentToolSummary
	| AgentWidgetPart;

export interface AgentUsage {
	credits: number;
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

/** A text file the agent read: a page from an offset, or the passages around search matches. */
export interface AgentFileReadOutput {
	mediaId: number;
	filename?: string;
	mimeType: string;
	/** Stored text, or readable text extracted from HTML. Offsets refer to this text. */
	contentType: "text" | "extracted-text";
	mode: "read" | "search";
	totalChars: number;
	passages: Array<{ offset: number; text: string }>;
	/** Where to continue reading or searching. Null when nothing is left. */
	nextOffset: number | null;
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
	conversationMode: AgentRoutineConversationMode;
	/** The saved chat used in reuse mode. Null until the first run, or after deletion. */
	conversationId: string | null;
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
	| ({ messageId: string } & AgentRunResultPart)
	/** A saved reply, sent when watching a run that is executing elsewhere. */
	| { type: "message"; message: AgentMessage }
	/** The conversation's pending input after it changed. */
	| { type: "inputs"; inputs: AgentInput[]; queuePaused: boolean }
	| { type: "finish"; runId: string; status: AgentRunStatus }
	/** The run a queued message started once this one finished. */
	| { type: "next"; runId: string }
	| { type: "error"; message: string };

import type { AiModelSelection, MediaGenerationType } from "../ai/types.js";
import type {
	DocumentVersionCheckBrick,
	DocumentVersionCheckField,
	DocumentVersionType,
} from "../documents/types.js";
import type { ResolvedAdminCopy } from "../locales/types.js";
import type { MediaType } from "../media/types.js";
import type { Refs } from "../refs/types.js";
import type { Permission } from "../users/types.js";

/** A media item, document or request in Lucid. */
export type AgentResource =
	| { type: "media"; mediaId: number }
	| { type: "document"; collectionKey: string; documentId: number }
	| { type: "request"; requestId: number };

/** A media item, document or request linked to a chat. A document can be pinned to one version. */
export type AgentReferenceInput =
	| Exclude<AgentResource, { type: "document" }>
	| (Extract<AgentResource, { type: "document" }> & { versionId?: number });

/** A reference with the details saved when it was attached, so a message keeps what was sent. */
export type AgentReferenceSnapshot = AgentReferenceInput & {
	label: string;
	mimeType?: string;
};

/** How a resource was linked to a chat. */
export type AgentReferenceSource =
	| { type: "message" }
	| { type: "tool"; toolName: string };

/** Describes the originating admin screen, whose browser tab answers builder tool calls when it is a document builder. */
export type AgentScreen = {
	/** The browser tab the screen is open in, which answers builder tools. */
	tabId: string;
	label: string;
} & (
	| {
			type: "document";
			collectionKey: string;
			/** Null when creating a document, before it is saved. */
			documentId: number | null;
			/** The request whose proposal is open, or null for latest. */
			requestId: number | null;
	  }
	| { type: "request"; requestId: number }
	| {
			/** A collection's document list. */
			type: "documents";
			collectionKey: string;
			contentLocale: string | null;
			/** The filter preset applied, or null when none is. */
			filter: string | null;
	  }
	| {
			/** The media library. */
			type: "media";
			/** The open folder, or null for the top level. */
			folderId: number | null;
			filter: string | null;
	  }
	| { type: "requests"; filter: string | null }
	| { type: "review" }
	| {
			/** A document's version history. */
			type: "history";
			collectionKey: string;
			documentId: number;
			/** The version selected in the timeline. */
			versionId: number | null;
	  }
);

/** A document's unsaved content as the builder holds it, in the shape the admin saves. */
export type AgentBuilderContent = {
	fields: DocumentVersionCheckField[];
	bricks: DocumentVersionCheckBrick[];
};

/** Parts an update replaces, adds or removes while preserving the builder's remaining content. */
export type AgentBuilderContentChanges = {
	/** The document's own fields that changed, replacing the builder's fields with the same keys. */
	fields: DocumentVersionCheckField[];
	/** Bricks that were added or whose fields changed, replacing the builder's bricks with the same refs. */
	bricks: DocumentVersionCheckBrick[];
	/** Refs of builder and embedded bricks that were removed. */
	removed: string[];
	/** Every builder brick's ref in its new order, or null when the order stayed the same. */
	order: string[] | null;
};

/** A field an update changed. */
export type AgentBuilderFieldChange = {
	/** Field keys from the brick down, with repeater item refs between them, eg. `["items", "Xy12ab", "title"]`. */
	path: string[];
	/** Changed content languages, empty for untranslated fields or repeater item changes. */
	locales: string[];
};

/** A brick, or the document's own fields, that an update changed. */
export type AgentBuilderChange = {
	/** The brick, or null for the document's own fields. */
	brick: {
		type: DocumentVersionCheckBrick["type"];
		key: string;
		ref: string;
	} | null;
	status: "added" | "removed" | "changed";
	/** Whether a builder brick the agent kept moved to another position. */
	moved: boolean;
	/** The fields that changed, for a changed brick or the document's own fields. */
	fields: AgentBuilderFieldChange[];
};

/** Saved data for the `lucid-builder-changes` card, listing what one builder update changed. */
export type AgentBuilderChangesData = {
	document: {
		collectionKey: string;
		/** Null when the document was being created, before it was saved. */
		documentId: number | null;
		/** The request whose proposal changed, or null for latest. */
		requestId: number | null;
	};
	changes: AgentBuilderChange[];
};

/** Saved data for the `lucid-references` card, listing the references one tool call linked to the chat. */
export type AgentReferencesData = {
	references: AgentReferenceInput[];
};

/** A field or brick in the document builder to scroll to. */
export type AgentBuilderFocus = {
	/** A builder brick's ref or a fixed brick's key. Omit it for the document's own fields. */
	brick?: string;
	field?: string;
	/** Switches the editor to this content language first. */
	contentLocale?: string;
};

/** What a tool asks the person's open screen to do, sent as the data of a `lucid-screen` interaction. */
export type AgentScreenCall =
	| { action: "read"; screen: AgentScreen }
	| {
			action: "update";
			screen: Extract<AgentScreen, { type: "document" }>;
			/** The read revision used to reject updates when their affected fields, bricks or brick order have changed. */
			revision: number;
			/** The version the content belongs to, or null before the document is saved. */
			versionId: number | null;
			content: AgentBuilderContentChanges;
			/** Media, documents and users the changed content links to, so fields can show them. */
			refs: Refs;
			/** What changed, which the tool saves for the chat once the builder applies it. */
			changes: AgentBuilderChange[];
			/** Validation errors in the updated document, which the tool reports once the builder applies it. */
			validationErrors: string[];
	  }
	| {
			action: "focus";
			screen: Extract<AgentScreen, { type: "document" }>;
			focus: AgentBuilderFocus;
	  };

/** Why a screen could not answer a tool call. */
export type AgentScreenUnavailableReason =
	/** The screen was closed, or it did not answer in time. */
	| "closed"
	/** The person moved to another screen. */
	| "moved"
	/** The document can't be edited, eg. someone else holds it. */
	| "locked"
	/** The content changed since it was read, so the update was not applied. */
	| "changed"
	/** The field or brick to focus wasn't found. */
	| "missing";

/** A screen's answer to a tool call. */
export type AgentScreenResponse =
	| {
			status: "done";
			/** The builder's state, answering a read. */
			document?: {
				revision: number;
				/** The version the builder's content belongs to, or null before the document is saved. */
				versionId: number | null;
				content: AgentBuilderContent;
				contentLocale: string | null;
				unsaved: boolean;
				editable: boolean;
			};
	  }
	| {
			status: "unavailable";
			reason: AgentScreenUnavailableReason;
			/** Where the person is now, when they moved. */
			screen?: AgentScreen;
	  };

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
	| Extract<AgentReferenceInput, { type: "request" }>
);

/** Capabilities derived from the tools available to the current user. */
export type AgentCapabilities = {
	media: {
		/** Supported media MIME types, or null when no analysis provider is available. */
		analyze: { mimeTypes: string[] } | null;
		/** Supported file MIME types, or null when no file reader is available. */
		readFile: { mimeTypes: string[] } | null;
		/** Media types the agent can generate or edit with Lucid AI. */
		generate: Record<MediaGenerationType, boolean>;
	};
	web: {
		search: boolean;
		read: boolean;
	};
};

/** An agent name used in navigation and saved chat labels. */
export type AgentSummary = {
	key: string;
	/** Translated for the person viewing it. */
	name: string;
	/** Whether the agent is offered in the agent sidebar beside admin pages. */
	sidebar: boolean;
};

/** Agent details available to the current admin user. */
export interface Agent {
	key: string;
	name: ResolvedAdminCopy;
	description: ResolvedAdminCopy;
	/** Configures composer attachments and tools for reading and editing the person's open document builder. */
	features: {
		/** Composer media generation creates personal uploads and requires `upload`. */
		media: {
			upload: boolean;
			attach: boolean;
			generate: Record<MediaGenerationType, boolean>;
		};
		documents: { attach: boolean };
		requests: { attach: boolean };
		builder: { read: boolean; edit: boolean };
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
		requiresConfirmation: boolean;
		interactive: boolean;
		permissions: Permission[];
	}[];
}

/** Configured agents and whether agent chat is enabled. */
export interface AgentCatalog {
	enabled: boolean;
	agents: Agent[];
}

/** Routines defined in code are synced from config; own routines are created by people in the admin. */
export type AgentRoutineSource = "code" | "own";

/** A routine's settings for one tool. Missing settings use the tool's defaults. */
export type AgentRoutineToolSettings = {
	requiresConfirmation?: boolean;
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
	/** The admin screen it was sent from. */
	screen: AgentScreen | null;
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

/** An agent that acted, for the person shown alongside it or for the system. */
export type AgentActor = {
	key: string;
	/** The agent's name, or its key once it is no longer configured. */
	name: string;
	/** It acted as the system rather than for a person. A missing person with this false was deleted. */
	system: boolean;
	/** The chat it acted in. Null once the chat is deleted. */
	conversationId: string | null;
};

/** The agent behind a run, returned in `refs.agents` for the run IDs on documents and versions. */
export type AgentRef = AgentActor & {
	/** The run ID. */
	id: string;
};

/** Tools registered through agent `features`, with `lucid_` names reserved for core tools. */
export type AgentLucidToolName =
	| "web_search"
	| "web_read"
	| "media_analyze"
	| "media_read_file"
	| "media_generate_image"
	| "media_edit_image"
	| "media_generate_audio"
	| "media_add_to_library"
	| "lucid_builder_read"
	| "lucid_builder_update"
	| "lucid_builder_focus";

/** Widgets supplied by Lucid's runner and core tools. */
export type AgentCoreWidgetKey =
	| "lucid-media-preview"
	| "lucid-question"
	| "lucid-tool-confirmation"
	| "lucid-tool-confirmation-batch"
	| "lucid-media-select"
	| "lucid-screen"
	| "lucid-builder-changes"
	| "lucid-references"
	| "lucid-image-settings"
	| "lucid-audio-settings";

/** Image settings reviewed before generation. */
export type AgentImageSettings = {
	instruction: string;
	title: string;
	/** The saved media's alt text, or null to use the title. */
	alt: string | null;
	guidance:
		| "natural"
		| "lifestyle"
		| "product"
		| "illustration"
		| "cinematic"
		| null;
	aspectRatio: string;
	/** Null for the model's default, or for models that pick their own. */
	resolution: string | null;
	/** Null for the model's default, or for models without a quality setting. */
	quality: string | null;
	/** Null for the model's default, or for models that return their own format. */
	outputFormat: string | null;
	/** The image model, or null for the configured default. */
	model: string | null;
};

/** Saved image settings and edit source for a `lucid-image-settings` interaction whose response is `AgentImageSettings`. */
export type AgentImageSettingsData = AgentImageSettings & {
	editMediaId: number | null;
};

/** Audio settings reviewed before generation, and the saved settings for a `lucid-audio-settings` interaction. */
export type AgentAudioSettings = {
	/** The text to speak. */
	script: string;
	title: string;
	/** Delivery instructions, such as tone and pacing, for models that take them. */
	instruction: string | null;
	/** The speech model, or null for the configured default. */
	model: string | null;
	/** The voice, or null for the model's default. */
	voice: string | null;
};

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

/** Personal chats or chats for routines owned by users or defined in code. */
export type AgentConversationKind = "chat" | "own-routine" | "code-routine";

export type AgentRoutineTrigger = "schedule" | "manual";

export type AgentRoutineConversationMode = "new" | "reuse";

/** A finished routine run's result, read from the run and shown on the card that starts it. */
export type AgentRunResultPart = {
	type: "run-result";
	outcome: AgentRunOutcome;
	summary: string;
	finishedAt: string;
};

/** How the title was set, with `generating` indicating clients should poll for an automatic title. */
export type AgentTitleStatus =
	| "provisional"
	| "generating"
	| "generated"
	| "user_set";

export type AgentToolStatus =
	| "pending"
	| "running"
	| "complete"
	| "failed"
	| "skipped";

/** Determines when agent tools pause for confirmation. Permission checks always apply. */
export type AgentConfirmationMode =
	| "confirm-all"
	| "tool-defaults"
	| "automatic";

/** Submit or cancel a tool's input request. */
export type AgentInteractionAction = "submit" | "cancel";

export type AgentInteraction = {
	id: string;
	toolCallId: string;
	answeredByUserId?: number;
	/** The prompt translated by the admin's copy helpers. */
	title: ResolvedAdminCopy;
	placement: "inline" | "composer";
	/** Present when submission also authorises this invocation. */
	confirmation?: { toolName: string; input: Record<string, unknown> };
	/** Exact independent calls covered by a grouped confirmation. Unselected calls are denied. */
	confirmations?: {
		toolCallId: string;
		toolName: string;
		title: ResolvedAdminCopy;
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
	/** Resources a completed call changed, so the admin can refresh its views of them. */
	changes?: AgentResource[];
};

export type AgentToolSummary = Omit<AgentToolDetails, "input" | "output"> & {
	/** False while a newly streamed call has not yet been saved. */
	detailsAvailable: boolean;
};

export type AgentMessagePart =
	| { type: "text"; text: string }
	| { type: "reference"; reference: AgentReferenceSnapshot }
	/** The admin screen the message was sent from. */
	| { type: "screen"; screen: AgentScreen }
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

export interface AgentWebReadOutput extends AgentWebSource {
	content: string;
	/** Full page text from the start, or excerpts chosen for an objective. */
	contentType: "page" | "excerpts";
	truncated: boolean;
}

/** Saved data for the `lucid-media-select` media picker. */
export interface AgentMediaSelectData {
	/** Allowed media types, or null to allow any type. */
	types: MediaType[] | null;
	/** The most media the person can pick. */
	max: number;
	/** The agent uploads are made for. */
	agentKey: string;
	/** Whether the person can select their own media, which only runs acting for them can read. */
	includePersonal: boolean;
	/** Whether the person can upload new files, which become their personal media. */
	upload: boolean;
}

/** The response to a `lucid-media-select` interaction. */
export interface AgentMediaSelectResponse {
	mediaIds: number[];
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
export interface AgentContextUsage {
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
	confirmationMode: AgentConfirmationMode;
	/** The model for the next run. Null uses the routine or agent default. */
	modelSelection: AiModelSelection | null;
	/** Queued messages wait until the user resumes, after a run was stopped or failed. */
	queuePaused: boolean;
	/** Only included when fetching a single conversation. */
	inputs?: AgentInput[];
	/** Unknown until the conversation's first model request. */
	context: AgentContextUsage | null;
	/** Only included when fetching a single conversation. */
	compactions?: AgentCompaction[];
	id: string;
	agentKey: string;
	title: string;
	titleStatus: AgentTitleStatus;
	kind: AgentConversationKind;
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
	toolSettings: Record<string, AgentRoutineToolSettings>;
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
	| { type: "context"; runId: string; context: AgentContextUsage }
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

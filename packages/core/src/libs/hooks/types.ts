import type { Draft, Objectish } from "immer";
import type constants from "../../constants/constants.js";
import type {
	AgentRunOutcome,
	CollectionTableNames,
	InternalCollectionDocument,
	Media,
} from "../../exports/types.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type { DocumentVersionType } from "../db/tables/index.js";
import type { RequestType } from "../db/tables/requests.js";
import type { Toolkit } from "../toolkit/types.js";

// --------------------------------------------------
// types

/** Describes every ID in a notification. Notify separately for different changes. */
export type DocumentChangeMetadata =
	| { type: "created" }
	| { type: "updated"; version?: string }
	| { type: "deleted"; permanent: boolean }
	| { type: "restored" }
	| { type: "published"; version: string }
	| { type: "unpublished"; version: string }
	| { type: "referencesUpdated"; version: string };

export type MediaChangeMetadata =
	| { type: "created" }
	| { type: "updated" }
	| { type: "deleted"; permanent: boolean }
	| { type: "restored" };

export type HookExecutionKind = "effect" | "transform";

type HookEventKinds<TEvents> = {
	[S in keyof TEvents]: {
		[E in keyof TEvents[S]]: TEvents[S][E] extends {
			kind: infer Kind extends HookExecutionKind;
		}
			? Kind
			: never;
	};
};

/** Whether each core hook event transforms data or only runs side effects. */
export type CoreHookExecutionKindMap = HookEventKinds<CoreHookEvents>;

/** Whether each core and plugin hook event transforms data or only runs side effects. */
export type HookExecutionKindMap = CoreHookExecutionKindMap &
	HookEventKinds<PluginHookEvents>;

/** The request that owns the version being written, with every version it has captured. */
export type DocumentHookRequest = {
	id: number;
	/** The content locales the request changes. Completing it writes only their values to latest. Null for whole documents. */
	locales: string[] | null;
	documents: Array<{
		collectionKey: string;
		documentId: number;
		/** Latest for a proposal, or the environment a snapshot came from. */
		source: string;
		/** The request's proposal or snapshot for the document. */
		versionId: number;
	}>;
};

type RequestHookMeta = {
	userId: number | null;
};

type CollectionHookMeta = {
	collection: CollectionDefinition;
	collectionKey: string;
};

type DocumentHookMeta = CollectionHookMeta & {
	collectionTableNames: CollectionTableNames;
};

type DocumentUserHookMeta = DocumentHookMeta & {
	userId: number | null;
	/** Set when the version written belongs to a request, eg. a proposal edit or capture. */
	request?: DocumentHookRequest;
};

export type DocumentBeforeUpsertHookOrigin =
	| {
			type: "standard";
	  }
	| {
			type: "duplicate";
			sourceDocumentId: number;
			sourceVersionId: number;
			sourceVersionType: "latest";
	  }
	/** Saved from an export file, eg. one downloaded from another site. */
	| {
			type: "import";
	  };

/** Explains whether this is a save, validation check or duplication. Check willPersist before performing side effects. */
export type DocumentBeforeUpsertHookExecution = {
	mode: "upsert" | "check";
	action: "create" | "update";
	/** Whether this operation intends to write the document. */
	willPersist: boolean;
	origin: DocumentBeforeUpsertHookOrigin;
};

type DocumentBeforeUpsertHookMeta = DocumentUserHookMeta & {
	execution: DocumentBeforeUpsertHookExecution;
};

type DocumentDeleteHookMeta = DocumentUserHookMeta & {
	hardDelete: boolean;
};

type MediaHookMeta = Record<string, never>;

type AgentHookMeta = {
	/** Who the run acted for. Null when it acted as the system, eg. a routine defined in code. */
	userId: number | null;
};

export type DocumentBeforeUpsertHookData = {
	documentId: number;
	versionId: number;
	versionType: Exclude<DocumentVersionType, "revision">;
	bricks?: Array<BrickInputSchema>;
	fields?: Array<FieldInputSchema>;
};

export type DocumentAfterUpsertHookData = {
	documentId: number;
	versionId: number;
	versionType: Exclude<DocumentVersionType, "revision">;
	bricks: Array<BrickInputSchema>;
	fields: Array<FieldInputSchema>;
};

export type DocumentAfterFetchHookData = {
	versionType: DocumentVersionType;
	relationVersionType: Exclude<DocumentVersionType, "revision">;
	documents: InternalCollectionDocument[];
};

export type DocumentDeleteHookData = {
	ids: number[];
};

/** Documents about to be removed from one environment. */
export type DocumentBeforeUnpublishHookData = {
	ids: number[];
	versionType: Exclude<DocumentVersionType, "revision">;
};

export type DocumentVersionPromoteHookData = {
	documentId: number;
	versionId: number;
	versionType: Exclude<DocumentVersionType, "revision">;
};

/** A request cloned a version into its own proposal or snapshot. */
export type DocumentVersionCaptureHookData = {
	documentId: number;
	versionId: number;
	versionType: Exclude<DocumentVersionType, "revision">;
	sourceVersionId: number;
	sourceVersionType: Exclude<DocumentVersionType, "revision">;
};

/** A reason a request cannot be approved or completed yet. Hook blockers carry their own message. */
export type RequestCheckBlocker = {
	requestDocumentId: number;
	target?: string;
	message: string;
};

/** A request has completed every document. Each entry lists the versions it published, which unpublish and delete requests leave empty. */
export type RequestCompletedHookData = {
	request: {
		id: number;
		type: RequestType;
		revision: number;
	};
	documents: Array<{
		requestDocumentId: number;
		collectionKey: string;
		documentId: number;
		/** Null for unpublish and delete requests. */
		source: string | null;
		/** Environments for unpublish requests, no targets for delete, and latest or environments for create and publish. */
		targets: string[];
		versions: Array<{ target: string; versionId: number }>;
	}>;
};

/** A document left an open request. The request lists what it still holds. */
export type RequestDocumentRemovedHookData = {
	request: DocumentHookRequest;
	collectionKey: string;
	documentId: number;
};

/** The request being checked. Hooks push blockers for documents that cannot be created, published, unpublished or deleted as they are. */
export type RequestCheckHookData = {
	request: {
		id: number;
		type: RequestType;
		revision: number;
	};
	/** The request's documents from one collection. Hooks run once for each collection. */
	documents: Array<{
		requestDocumentId: number;
		collectionKey: string;
		documentId: number;
		/** Latest for a proposal, or the environment a snapshot came from. Null for unpublish and delete requests. */
		source: string | null;
		/** The content to be created or published. Null when it is unavailable, or for unpublish and delete requests. */
		versionId: number | null;
		targets: string[];
	}>;
	blockers: RequestCheckBlocker[];
};

export type DocumentWorkflowAfterUpdateHookData = {
	versionId: number;
	collectionKey: string;
	documentId: number;
	userId: number | null;
	previousStage: string;
	nextStage: string;
	previousAssigneeIds: number[];
	nextAssigneeIds: number[];
	stageChanged: boolean;
	assigneesChanged: boolean;
};

/** The notification being sent. Data is what the sender passed, already validated. */
type NotificationHookMeta = {
	type: string;
	key: string | null;
	data: Record<string, unknown>;
	actorUserId: number | null;
};

/** Who will receive the notification. Empty the list to suppress it. */
export type NotificationBeforeSendHookData = {
	recipients: number[];
};

/** A notification was created, or an existing one was updated or reopened. */
export type NotificationAfterSendHookData = {
	id: number;
	type: string;
	key: string | null;
	recipients: number[];
	created: boolean;
};

export type MediaAfterCreateHookData = {
	id: number;
	userId: number | null;
	media: Media;
};

export type MediaAfterUpdateHookData = {
	id: number;
	userId: number | null;
};

export type MediaAfterDeleteHookData = {
	ids: number[];
	userId: number | null;
	hardDelete: boolean;
};

/** An agent run stopped for good. Fires once, whether it completed, failed or was cancelled. */
export type AgentRunFinishedHookData = {
	runId: string;
	conversationId: string;
	agentKey: string;
	/** The routine that started the run, if any. */
	routineId: string | null;
	status: (typeof constants.agent.runStatuses.terminal)[number];
	/** What a completed routine run reported. Null for other runs. */
	result: { outcome: AgentRunOutcome; summary: string } | null;
	/** Why a failed run stopped. */
	errorMessage: string | null;
};

/** Mutable data and event metadata. Edit the draft and return nothing, or return replacement data. */
export type TransformHookPayload<TMeta, TData> = {
	meta: TMeta;
	data: Draft<TData>;
};

/** Event data and metadata for side effects. Return nothing. */
export type EffectHookPayload<TMeta, TData> = {
	meta: TMeta;
	data: TData;
};

/** The execution kind of one hook event. */
export type HookExecutionKindOf<S, E> = S extends keyof HookExecutionKindMap
	? E extends keyof HookExecutionKindMap[S]
		? HookExecutionKindMap[S][E]
		: never
	: never;

/** The data a transform event passes through its hooks. Never for effect events. */
export type TransformHookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> =
	HookExecutionKindOf<S, E> extends "transform"
		? Extract<HookData<S, E>, Objectish>
		: never;

export type ExecuteHookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = [TransformHookData<S, E>] extends [never]
	? HookData<S, E>
	: TransformHookData<S, E>;

/** A lifecycle event subscription. Use `defineHook` to infer handler arguments. */
export type LucidHook<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	service: S;
	event: E;
	handler: HookServiceHandlers[S][E];
	/** Lower values execute first. Defaults to zero. */
	order?: number;
};

export type LucidHookDocuments<
	E extends keyof HookServiceHandlers["documents"],
> = LucidHook<"documents", E>;

// --------------------------------------------------
// service handlers

/**
 * Receives event data, metadata and transaction-bound helpers. Effects return nothing; transforms
 * may replace data. Throw LucidError to fail.
 */
type HookHandler<
	TPayload extends EffectHookPayload<unknown, unknown>,
	TData,
> = (
	args: TPayload & {
		context: ServiceContext;
		toolkit: Toolkit;
	},
) => TData | void | Promise<TData | void>;

/** Defines core hook data and metadata. Add new events here and in `hookExecutionKinds`. */
type CoreHookEvents = {
	documents: {
		afterChange: EffectHookEvent<
			CollectionHookMeta,
			{ ids: number[]; change?: DocumentChangeMetadata }
		>;
		beforeUpsert: TransformHookEvent<
			DocumentBeforeUpsertHookMeta,
			DocumentBeforeUpsertHookData
		>;
		afterUpsert: EffectHookEvent<
			DocumentUserHookMeta,
			DocumentAfterUpsertHookData
		>;
		afterFetch: TransformHookEvent<
			DocumentHookMeta,
			DocumentAfterFetchHookData
		>;
		beforeDelete: EffectHookEvent<
			DocumentDeleteHookMeta,
			DocumentDeleteHookData
		>;
		afterDelete: EffectHookEvent<
			DocumentDeleteHookMeta,
			DocumentDeleteHookData
		>;
		beforeUnpublish: EffectHookEvent<
			DocumentUserHookMeta,
			DocumentBeforeUnpublishHookData
		>;
		afterRestore: EffectHookEvent<DocumentHookMeta, DocumentDeleteHookData>;
		afterVersionPromote: EffectHookEvent<
			DocumentUserHookMeta,
			DocumentVersionPromoteHookData
		>;
		afterVersionCapture: EffectHookEvent<
			DocumentUserHookMeta,
			DocumentVersionCaptureHookData
		>;
	};
	documentWorkflows: {
		afterUpdate: EffectHookEvent<
			DocumentUserHookMeta,
			DocumentWorkflowAfterUpdateHookData
		>;
	};
	requests: {
		afterCheck: TransformHookEvent<Record<string, never>, RequestCheckHookData>;
		afterComplete: EffectHookEvent<RequestHookMeta, RequestCompletedHookData>;
		afterDocumentRemove: EffectHookEvent<
			RequestHookMeta,
			RequestDocumentRemovedHookData
		>;
	};
	notifications: {
		beforeSend: TransformHookEvent<
			NotificationHookMeta,
			NotificationBeforeSendHookData
		>;
		afterSend: EffectHookEvent<
			NotificationHookMeta,
			NotificationAfterSendHookData
		>;
	};
	media: {
		afterChange: EffectHookEvent<
			MediaHookMeta,
			{ ids: number[]; change?: MediaChangeMetadata }
		>;
		afterRestore: EffectHookEvent<MediaHookMeta, { ids: number[] }>;
		afterCreate: EffectHookEvent<MediaHookMeta, MediaAfterCreateHookData>;
		afterUpdate: EffectHookEvent<MediaHookMeta, MediaAfterUpdateHookData>;
		afterDelete: EffectHookEvent<MediaHookMeta, MediaAfterDeleteHookData>;
	};
	agent: {
		afterRunFinish: EffectHookEvent<AgentHookMeta, AgentRunFinishedHookData>;
	};
};

// --------------------------------------------------
// plugin hook events

/** Plugin event for side effects. */
export type EffectHookEvent<TMeta, TData> = {
	kind: "effect";
	meta: TMeta;
	data: TData;
};

/** Transform event with mutable plain object, array, Map or Set data. */
export type TransformHookEvent<TMeta, TData extends Objectish> = {
	kind: "transform";
	meta: TMeta;
	data: TData;
};

/**
 * Augment by service key with `EffectHookEvent` or `TransformHookEvent`, then register matching
 * events with `defineHookEvents`. Events require the plugin to be configured.
 */
// oxlint-disable-next-line typescript/no-empty-object-type -- plugins merge their hook events into this interface
export interface PluginHookEvents {}

type HookEventHandler<TEvent> =
	TEvent extends TransformHookEvent<infer TMeta, infer TData extends Objectish>
		? HookHandler<TransformHookPayload<TMeta, TData>, TData>
		: TEvent extends EffectHookEvent<infer TMeta, infer TData>
			? HookHandler<EffectHookPayload<TMeta, TData>, undefined>
			: never;

type HookEventHandlers<TEvents> = {
	[S in keyof TEvents]: {
		[E in keyof TEvents[S]]: HookEventHandler<TEvents[S][E]>;
	};
};

/** Every hook event handler, by service and event, including plugin events. */
export type HookServiceHandlers = HookEventHandlers<CoreHookEvents> &
	HookEventHandlers<PluginHookEvents>;

/** Hook events a plugin registers through its `hookEvents`. */
export type HookEventsDefinition = {
	readonly type: "hook-events-definition";
	/** The service key hooks subscribe with, such as `pages`. */
	readonly key: string;
	/** Each event's execution kind. */
	readonly events: Readonly<Record<string, HookExecutionKind>>;
};

/** A plugin's hook events, returned by `defineHookEvents`, with a typed way to run them. */
export type PluginHookEventsDefinition<TKey extends keyof PluginHookEvents> =
	HookEventsDefinition & {
		readonly key: TKey;
		readonly events: HookExecutionKindMap[TKey];
		/**
		 * Runs hooks in order until the first error. Transforms return final data; effects return
		 * undefined data.
		 */
		readonly execute: <E extends keyof HookServiceHandlers[TKey]>(
			context: ServiceContext,
			event: E,
			payload: HookPayload<TKey, E>,
		) => ServiceResponse<ExecuteHookData<TKey, E>>;
	};

export type HookOptions<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	service: S;
	event: E;
	config: ResolvedLucidConfig;
	collectionInstance?: CollectionDefinition;
};

export type HookPayload<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> =
	HookServiceHandlers[S][E] extends HookHandler<infer Payload, infer _Data>
		? Payload
		: never;

export type HookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> =
	HookServiceHandlers[S][E] extends HookHandler<infer _Args, infer Data>
		? Data | undefined
		: never;

// --------------------------------------------------
// service config

/** Every hook for one service's events. */
export type ServiceHooks<S extends keyof HookServiceHandlers> = {
	[E in keyof HookServiceHandlers[S]]: LucidHook<S, E>;
}[keyof HookServiceHandlers[S]];

/** Hooks registered only for one collection. */
export type CollectionHooks =
	| ServiceHooks<"documents">
	| ServiceHooks<"documentWorkflows">
	| LucidHook<"requests", "afterCheck">;

/** Every hook a project or plugin can register, including configured plugins' events. */
export type AllHooks = {
	[S in keyof HookServiceHandlers]: ServiceHooks<S>;
}[keyof HookServiceHandlers];

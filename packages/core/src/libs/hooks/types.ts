import type { Draft } from "immer";
import type {
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
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { DocumentVersionType } from "../db/tables/index.js";
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
	| { type: "referencesUpdated"; version: string };

export type MediaChangeMetadata =
	| { type: "created" }
	| { type: "updated" }
	| { type: "deleted"; permanent: boolean }
	| { type: "restored" };

export type HookExecutionKind = "effect" | "transform";

export type HookExecutionKindMap = {
	documents: {
		afterChange: "effect";
		beforeUpsert: "transform";
		afterUpsert: "effect";
		afterFetch: "transform";
		beforeDelete: "effect";
		afterRestore: "effect";
		afterDelete: "effect";
		versionPromote: "effect";
		versionCapture: "effect";
	};
	documentWorkflows: {
		afterUpdate: "effect";
	};
	requests: {
		check: "transform";
		completed: "effect";
		documentRemoved: "effect";
	};
	notifications: {
		beforeSend: "transform";
		afterSend: "effect";
	};
	media: {
		afterChange: "effect";
		afterRestore: "effect";
		afterCreate: "effect";
		afterUpdate: "effect";
		afterDelete: "effect";
	};
};

/** The request that owns the version being written, with every version it has captured. */
export type DocumentHookRequest = {
	id: number;
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
	collection: CollectionBuilder;
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

/** A reason a request cannot be approved or published yet. Hook blockers carry their own message. */
export type RequestCheckBlocker = {
	requestDocumentId: number;
	target?: string;
	message: string;
};

/** A request has published every document to its targets. Each entry lists the new environment versions. */
export type RequestCompletedHookData = {
	request: {
		id: number;
		revision: number;
	};
	documents: Array<{
		requestDocumentId: number;
		collectionKey: string;
		documentId: number;
		source: string;
		versions: Array<{ target: string; versionId: number }>;
	}>;
};

/** A document left an open request. The request lists what it still holds. */
export type RequestDocumentRemovedHookData = {
	request: DocumentHookRequest;
	collectionKey: string;
	documentId: number;
};

/** The request being checked. Hooks push blockers for documents that cannot be created or published as they are. */
export type RequestCheckHookData = {
	request: {
		id: number;
		revision: number;
	};
	/** The request's documents from one collection. Hooks run once for each collection. */
	documents: Array<{
		requestDocumentId: number;
		collectionKey: string;
		documentId: number;
		/** Latest for a proposal, or the environment a snapshot came from. */
		source: string;
		/** The content to be created or published. Null when it is unavailable. */
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
export type NotificationHookMeta = {
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

/** Mutable data and event metadata. Return undefined data to keep draft edits, or return replacement data. */
export type TransformHookPayload<TMeta, TData> = {
	meta: TMeta;
	data: Draft<TData>;
};

/** Event data and metadata for side effects. Return a service result with undefined data. */
export type EffectHookPayload<TMeta, TData> = {
	meta: TMeta;
	data: TData;
};

export type TransformHookDataMap = {
	documents: {
		beforeUpsert: DocumentBeforeUpsertHookData;
		afterFetch: DocumentAfterFetchHookData;
	};
	requests: {
		check: RequestCheckHookData;
	};
	notifications: {
		beforeSend: NotificationBeforeSendHookData;
	};
};

export type TransformHookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = S extends keyof TransformHookDataMap
	? E extends keyof TransformHookDataMap[S]
		? TransformHookDataMap[S][E]
		: never
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

/** A hook receives event data, metadata and helpers bound to the current transaction. */
type HookHandler<
	TPayload extends EffectHookPayload<unknown, unknown>,
	TData,
> = (
	args: TPayload & {
		context: ServiceContext;
		toolkit: Toolkit;
	},
) => ServiceResponse<TData>;

/** Handler signatures by service and event. */
export type HookServiceHandlers = {
	documents: {
		afterChange: HookHandler<
			EffectHookPayload<
				CollectionHookMeta,
				{ ids: number[]; change?: DocumentChangeMetadata }
			>,
			undefined
		>;
		beforeUpsert: HookHandler<
			TransformHookPayload<
				DocumentBeforeUpsertHookMeta,
				DocumentBeforeUpsertHookData
			>,
			DocumentBeforeUpsertHookData | undefined
		>;
		afterUpsert: HookHandler<
			EffectHookPayload<DocumentUserHookMeta, DocumentAfterUpsertHookData>,
			undefined
		>;
		afterFetch: HookHandler<
			TransformHookPayload<DocumentHookMeta, DocumentAfterFetchHookData>,
			DocumentAfterFetchHookData | undefined
		>;
		beforeDelete: HookHandler<
			EffectHookPayload<DocumentDeleteHookMeta, DocumentDeleteHookData>,
			undefined
		>;
		afterDelete: HookHandler<
			EffectHookPayload<DocumentDeleteHookMeta, DocumentDeleteHookData>,
			undefined
		>;
		afterRestore: HookHandler<
			EffectHookPayload<DocumentHookMeta, DocumentDeleteHookData>,
			undefined
		>;
		versionPromote: HookHandler<
			EffectHookPayload<DocumentUserHookMeta, DocumentVersionPromoteHookData>,
			undefined
		>;
		versionCapture: HookHandler<
			EffectHookPayload<DocumentUserHookMeta, DocumentVersionCaptureHookData>,
			undefined
		>;
	};
	documentWorkflows: {
		afterUpdate: HookHandler<
			EffectHookPayload<
				DocumentUserHookMeta,
				DocumentWorkflowAfterUpdateHookData
			>,
			undefined
		>;
	};
	requests: {
		check: HookHandler<
			TransformHookPayload<Record<string, never>, RequestCheckHookData>,
			RequestCheckHookData | undefined
		>;
		completed: HookHandler<
			EffectHookPayload<RequestHookMeta, RequestCompletedHookData>,
			undefined
		>;
		documentRemoved: HookHandler<
			EffectHookPayload<RequestHookMeta, RequestDocumentRemovedHookData>,
			undefined
		>;
	};

	notifications: {
		beforeSend: HookHandler<
			TransformHookPayload<
				NotificationHookMeta,
				NotificationBeforeSendHookData
			>,
			NotificationBeforeSendHookData | undefined
		>;
		afterSend: HookHandler<
			EffectHookPayload<NotificationHookMeta, NotificationAfterSendHookData>,
			undefined
		>;
	};
	media: {
		afterChange: HookHandler<
			EffectHookPayload<
				MediaHookMeta,
				{ ids: number[]; change?: MediaChangeMetadata }
			>,
			undefined
		>;
		afterRestore: HookHandler<
			EffectHookPayload<MediaHookMeta, { ids: number[] }>,
			undefined
		>;
		afterCreate: HookHandler<
			EffectHookPayload<MediaHookMeta, MediaAfterCreateHookData>,
			undefined
		>;
		afterUpdate: HookHandler<
			EffectHookPayload<MediaHookMeta, MediaAfterUpdateHookData>,
			undefined
		>;
		afterDelete: HookHandler<
			EffectHookPayload<MediaHookMeta, MediaAfterDeleteHookData>,
			undefined
		>;
	};
};

export type HookOptions<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	service: S;
	event: E;
	config: ResolvedLucidConfig;
	collectionInstance?: CollectionBuilder;
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
		? Data
		: never;

// --------------------------------------------------
// service config

/** Hooks registered only for one collection. */
export type CollectionBuilderHooks =
	| LucidHookDocuments<"afterChange">
	| LucidHookDocuments<"beforeUpsert">
	| LucidHookDocuments<"afterUpsert">
	| LucidHookDocuments<"afterFetch">
	| LucidHookDocuments<"beforeDelete">
	| LucidHookDocuments<"afterDelete">
	| LucidHookDocuments<"afterRestore">
	| LucidHookDocuments<"versionPromote">
	| LucidHookDocuments<"versionCapture">
	| LucidHook<"documentWorkflows", "afterUpdate">
	| LucidHook<"requests", "check">;

export type DocumentHooks =
	| LucidHook<"documents", "afterChange">
	| LucidHook<"documents", "beforeUpsert">
	| LucidHook<"documents", "afterUpsert">
	| LucidHook<"documents", "afterFetch">
	| LucidHook<"documents", "beforeDelete">
	| LucidHook<"documents", "afterDelete">
	| LucidHook<"documents", "afterRestore">
	| LucidHook<"documents", "versionPromote">
	| LucidHook<"documents", "versionCapture">;

export type DocumentWorkflowHooks = LucidHook<
	"documentWorkflows",
	"afterUpdate"
>;

export type RequestHooks =
	| LucidHook<"requests", "check">
	| LucidHook<"requests", "completed">
	| LucidHook<"requests", "documentRemoved">;

export type NotificationHooks =
	| LucidHook<"notifications", "beforeSend">
	| LucidHook<"notifications", "afterSend">;

export type MediaHooks =
	| LucidHook<"media", "afterChange">
	| LucidHook<"media", "afterRestore">
	| LucidHook<"media", "afterCreate">
	| LucidHook<"media", "afterUpdate">
	| LucidHook<"media", "afterDelete">;

// add all hooks to this type
export type AllHooks =
	| DocumentHooks
	| DocumentWorkflowHooks
	| RequestHooks
	| NotificationHooks
	| MediaHooks;

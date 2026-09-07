import type { Draft } from "immer";
import type {
	CollectionTableNames,
	InternalCollectionDocument,
	Media,
} from "../../exports/types.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	DocumentPublishOperationEventType,
	DocumentVersionType,
} from "../db/tables/index.js";

// --------------------------------------------------
// types

export type HookExecutionKind = "effect" | "transform";

export type HookExecutionKindMap = {
	documents: {
		beforeUpsert: "transform";
		afterUpsert: "effect";
		afterFetch: "transform";
		beforeDelete: "effect";
		afterDelete: "effect";
		versionPromote: "effect";
	};
	documentWorkflows: {
		afterUpdate: "effect";
	};
	publishOperations: {
		afterEvent: "effect";
	};
	media: {
		afterCreate: "effect";
		afterUpdate: "effect";
		afterDelete: "effect";
	};
};

export type ArgumentsType<T> = T extends (...args: infer U) => unknown
	? U
	: never;

type CollectionHookMeta = {
	collection: CollectionBuilder;
	collectionKey: string;
};

type DocumentHookMeta = CollectionHookMeta & {
	collectionTableNames: CollectionTableNames;
};

type DocumentUserHookMeta = DocumentHookMeta & {
	userId: number | null;
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

export type DocumentWorkflowAfterUpdateHookData = {
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

export type PublishOperationAfterEventHookData = {
	operationId: number;
	collectionKey: string;
	documentId: number;
	target: string;
	event: {
		id: number;
		type: DocumentPublishOperationEventType;
		userId: number | null;
		comment: string | null;
		metadata: Record<string, unknown>;
		createdAt: string | Date;
	};
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

/** Handler signatures by service and event. Each receives ServiceContext first. */
export type HookServiceHandlers = {
	documents: {
		beforeUpsert: ServiceFn<
			[
				TransformHookPayload<
					DocumentBeforeUpsertHookMeta,
					DocumentBeforeUpsertHookData
				>,
			],
			DocumentBeforeUpsertHookData | undefined
		>;
		afterUpsert: ServiceFn<
			[EffectHookPayload<DocumentUserHookMeta, DocumentAfterUpsertHookData>],
			undefined
		>;
		afterFetch: ServiceFn<
			[TransformHookPayload<DocumentHookMeta, DocumentAfterFetchHookData>],
			DocumentAfterFetchHookData | undefined
		>;
		beforeDelete: ServiceFn<
			[EffectHookPayload<DocumentDeleteHookMeta, DocumentDeleteHookData>],
			undefined
		>;
		afterDelete: ServiceFn<
			[EffectHookPayload<DocumentDeleteHookMeta, DocumentDeleteHookData>],
			undefined
		>;
		versionPromote: ServiceFn<
			[EffectHookPayload<DocumentUserHookMeta, DocumentVersionPromoteHookData>],
			undefined
		>;
	};
	documentWorkflows: {
		afterUpdate: ServiceFn<
			[
				EffectHookPayload<
					DocumentUserHookMeta,
					DocumentWorkflowAfterUpdateHookData
				>,
			],
			undefined
		>;
	};
	publishOperations: {
		afterEvent: ServiceFn<
			[
				EffectHookPayload<
					CollectionHookMeta,
					PublishOperationAfterEventHookData
				>,
			],
			undefined
		>;
	};
	media: {
		afterCreate: ServiceFn<
			[EffectHookPayload<MediaHookMeta, MediaAfterCreateHookData>],
			undefined
		>;
		afterUpdate: ServiceFn<
			[EffectHookPayload<MediaHookMeta, MediaAfterUpdateHookData>],
			undefined
		>;
		afterDelete: ServiceFn<
			[EffectHookPayload<MediaHookMeta, MediaAfterDeleteHookData>],
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

export type HookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> =
	HookServiceHandlers[S][E] extends ServiceFn<infer _Args, infer Data>
		? Data
		: never;

export type HookResponse<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = Awaited<ServiceResponse<HookData<S, E>>>;

// --------------------------------------------------
// service config

// used for collection builder hook config
/** Document hooks registered only for one collection. */
export type CollectionBuilderHooks =
	| LucidHookDocuments<"beforeUpsert">
	| LucidHookDocuments<"afterUpsert">
	| LucidHookDocuments<"afterFetch">
	| LucidHookDocuments<"beforeDelete">
	| LucidHookDocuments<"afterDelete">
	| LucidHook<"documentWorkflows", "afterUpdate">
	| LucidHook<"publishOperations", "afterEvent">;

export type DocumentHooks =
	| LucidHook<"documents", "beforeUpsert">
	| LucidHook<"documents", "afterUpsert">
	| LucidHook<"documents", "afterFetch">
	| LucidHook<"documents", "beforeDelete">
	| LucidHook<"documents", "afterDelete">
	| LucidHook<"documents", "versionPromote">;

export type DocumentWorkflowHooks = LucidHook<
	"documentWorkflows",
	"afterUpdate"
>;

export type PublishOperationHooks = LucidHook<
	"publishOperations",
	"afterEvent"
>;

export type MediaHooks =
	| LucidHook<"media", "afterCreate">
	| LucidHook<"media", "afterUpdate">
	| LucidHook<"media", "afterDelete">;

// add all hooks to this type
export type AllHooks =
	| DocumentHooks
	| DocumentWorkflowHooks
	| PublishOperationHooks
	| MediaHooks;

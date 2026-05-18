import type { Draft } from "immer";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { Config } from "../../types/config.js";
import type {
	CollectionTableNames,
	InternalCollectionDocument,
	Media,
} from "../../types.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	DocumentPublishOperationEventType,
	DocumentVersionType,
} from "../db/types.js";

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
	userId: number;
};

type DocumentDeleteHookMeta = DocumentUserHookMeta & {
	hardDelete: boolean;
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

export type DocumentVersionPromoteHookData = {
	documentId: number;
	versionId: number;
	versionType: Exclude<DocumentVersionType, "revision">;
};

export type DocumentWorkflowAfterUpdateHookData = {
	collectionKey: string;
	documentId: number;
	userId: number;
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
	userId: number;
	media: Media;
};

export type MediaAfterUpdateHookData = {
	id: number;
	userId: number;
};

export type MediaAfterDeleteHookData = {
	ids: number[];
	userId: number;
	hardDelete: boolean;
};

export type TransformHookPayload<TMeta, TData> = {
	meta: TMeta;
	data: Draft<TData>;
};

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

type TransformHookPriority<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = [TransformHookData<S, E>] extends [never]
	? { priority?: never }
	: {
			/**
			 * Orders transform hooks before they run. Lower values execute first,
			 * defaulting to `0` so negative priorities run before default hooks and
			 * positive priorities run after them.
			 */
			priority?: number;
		};

export type LucidHook<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	service: S;
	event: E;
	handler: HookServiceHandlers[S][E];
} & TransformHookPriority<S, E>;

export type LucidHookDocuments<
	E extends keyof HookServiceHandlers["documents"],
> = LucidHook<"documents", E>;

// --------------------------------------------------
// service handlers

export type HookServiceHandlers = {
	documents: {
		beforeUpsert: ServiceFn<
			[
				TransformHookPayload<
					DocumentUserHookMeta,
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
			[EffectHookPayload<Record<string, never>, MediaAfterCreateHookData>],
			undefined
		>;
		afterUpdate: ServiceFn<
			[EffectHookPayload<Record<string, never>, MediaAfterUpdateHookData>],
			undefined
		>;
		afterDelete: ServiceFn<
			[EffectHookPayload<Record<string, never>, MediaAfterDeleteHookData>],
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
	config: Config;
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

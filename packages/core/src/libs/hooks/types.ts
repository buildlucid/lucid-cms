import type { Draft } from "immer";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { Config } from "../../types/config.js";
import type {
	CollectionTableNames,
	InternalCollectionDocument,
} from "../../types.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { DocumentVersionType } from "../db/types.js";

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
};

export type ArgumentsType<T> = T extends (...args: infer U) => unknown
	? U
	: never;

type DocumentHookMeta = {
	collection: CollectionBuilder;
	collectionKey: string;
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
> = {
	event: E;
	handler: HookServiceHandlers["documents"][E];
} & TransformHookPriority<"documents", E>;

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
export type DocumentBuilderHooks =
	| LucidHookDocuments<"beforeUpsert">
	| LucidHookDocuments<"afterUpsert">
	| LucidHookDocuments<"afterFetch">
	| LucidHookDocuments<"beforeDelete">
	| LucidHookDocuments<"afterDelete">;

export type DocumentHooks =
	| LucidHook<"documents", "beforeUpsert">
	| LucidHook<"documents", "afterUpsert">
	| LucidHook<"documents", "afterFetch">
	| LucidHook<"documents", "beforeDelete">
	| LucidHook<"documents", "afterDelete">
	| LucidHook<"documents", "versionPromote">;

// add all hooks to this type
export type AllHooks = DocumentHooks;

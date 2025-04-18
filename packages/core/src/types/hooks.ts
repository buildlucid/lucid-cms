import type { CollectionBuilder } from "../builders.js";
import type { DocumentVersionType } from "../libs/db/types.js";
import type { BrickSchema } from "../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../schemas/collection-fields.js";
import type { ServiceFn } from "../utils/services/types.js";

// --------------------------------------------------
// types

export interface LucidHook<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> {
	service: S;
	event: E;
	handler: HookServiceHandlers[S][E];
}

export interface LucidHookCollection<
	E extends keyof HookServiceHandlers["collection-documents"],
> {
	event: E;
	handler: HookServiceHandlers["collection-documents"][E];
}

export type ArgumentsType<T> = T extends (...args: infer U) => unknown
	? U
	: never;

// --------------------------------------------------
// service handlers

export type HookServiceHandlers = {
	"collection-documents": {
		beforeUpsert: ServiceFn<
			[
				{
					meta: {
						collection: CollectionBuilder;
						collectionKey: string;
						userId: number;
					};
					data: {
						documentId: number;
						versionId: number;
						versionType: Exclude<DocumentVersionType, "revision">;
						bricks?: Array<BrickSchema>;
						fields?: Array<FieldSchemaType>;
					};
				},
			],
			| {
					documentId: number;
					versionId: number;
					versionType: Exclude<DocumentVersionType, "revision">;
					bricks?: Array<BrickSchema>;
					fields?: Array<FieldSchemaType>;
			  }
			| undefined
		>;
		afterUpsert: ServiceFn<
			[
				{
					meta: {
						collection: CollectionBuilder;
						collectionKey: string;
						userId: number;
					};
					data: {
						documentId: number;
						versionId: number;
						versionType: Exclude<DocumentVersionType, "revision">;
						bricks: Array<BrickSchema>;
						fields: Array<FieldSchemaType>;
					};
				},
			],
			undefined
		>;
		beforeDelete: ServiceFn<
			[
				{
					meta: {
						collection: CollectionBuilder;
						collectionKey: string;
						userId: number;
					};
					data: {
						ids: number[];
					};
				},
			],
			undefined
		>;
		afterDelete: ServiceFn<
			[
				{
					meta: {
						collection: CollectionBuilder;
						collectionKey: string;
						userId: number;
					};
					data: {
						ids: number[];
					};
				},
			],
			undefined
		>;
		versionPromote: ServiceFn<
			[
				{
					meta: {
						collection: CollectionBuilder;
						collectionKey: string;
						userId: number;
					};
					data: {
						documentId: number;
						versionId: number;
						versionType: Exclude<DocumentVersionType, "revision">;
					};
				},
			],
			undefined
		>;
	};
};

// --------------------------------------------------
// service config

// used for collection builder hook config
export type CollectionDocumentBuilderHooks =
	| LucidHookCollection<"beforeUpsert">
	| LucidHookCollection<"afterUpsert">
	| LucidHookCollection<"beforeDelete">
	| LucidHookCollection<"afterDelete">;

export type CollectionDocumentHooks =
	| LucidHook<"collection-documents", "beforeUpsert">
	| LucidHook<"collection-documents", "afterUpsert">
	| LucidHook<"collection-documents", "beforeDelete">
	| LucidHook<"collection-documents", "afterDelete">
	| LucidHook<"collection-documents", "versionPromote">;

// add all hooks to this type
export type AllHooks = CollectionDocumentHooks;

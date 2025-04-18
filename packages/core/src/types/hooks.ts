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

export interface LucidHookDocuments<
	E extends keyof HookServiceHandlers["documents"],
> {
	event: E;
	handler: HookServiceHandlers["documents"][E];
}

export type ArgumentsType<T> = T extends (...args: infer U) => unknown
	? U
	: never;

// --------------------------------------------------
// service handlers

export type HookServiceHandlers = {
	documents: {
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
export type DocumentBuilderHooks =
	| LucidHookDocuments<"beforeUpsert">
	| LucidHookDocuments<"afterUpsert">
	| LucidHookDocuments<"beforeDelete">
	| LucidHookDocuments<"afterDelete">;

export type DocumentHooks =
	| LucidHook<"documents", "beforeUpsert">
	| LucidHook<"documents", "afterUpsert">
	| LucidHook<"documents", "beforeDelete">
	| LucidHook<"documents", "afterDelete">
	| LucidHook<"documents", "versionPromote">;

// add all hooks to this type
export type AllHooks = DocumentHooks;

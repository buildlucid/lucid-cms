import type CollectionBuilder from "../libs/builders/collection-builder/index.js";
import type { DocumentVersionType } from "../libs/db-adapter/types.js";
import type { BrickInputSchema } from "../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../schemas/collection-fields.js";
import type { CollectionTableNames } from "../types.js";
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
						collectionTableNames: CollectionTableNames;
					};
					data: {
						documentId: number;
						versionId: number;
						versionType: Exclude<DocumentVersionType, "revision">;
						bricks?: Array<BrickInputSchema>;
						fields?: Array<FieldInputSchema>;
					};
				},
			],
			| {
					documentId: number;
					versionId: number;
					versionType: Exclude<DocumentVersionType, "revision">;
					bricks?: Array<BrickInputSchema>;
					fields?: Array<FieldInputSchema>;
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
						collectionTableNames: CollectionTableNames;
					};
					data: {
						documentId: number;
						versionId: number;
						versionType: Exclude<DocumentVersionType, "revision">;
						bricks: Array<BrickInputSchema>;
						fields: Array<FieldInputSchema>;
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
						collectionTableNames: CollectionTableNames;
						hardDelete: boolean;
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
						collectionTableNames: CollectionTableNames;
						hardDelete: boolean;
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
						collectionTableNames: CollectionTableNames;
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

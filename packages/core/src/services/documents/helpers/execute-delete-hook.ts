import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { CollectionTableNames, ServiceFn } from "../../../types.js";

const executeDeleteHook: ServiceFn<
	[
		{
			event: "beforeDelete" | "afterDelete";
			collection: CollectionBuilder;
			collectionKey: string;
			tableNames: CollectionTableNames;
			userId: number;
			ids: number[];
			hardDelete: boolean;
		},
	],
	undefined
> = async (context, data) => {
	return executeHooks(
		context,
		{
			service: "documents",
			event: data.event,
			config: context.config,
			collectionInstance: data.collection,
		},
		{
			meta: {
				collection: data.collection,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: data.tableNames,
				hardDelete: data.hardDelete,
			},
			data: {
				ids: data.ids,
			},
		},
	);
};

export default executeDeleteHook;

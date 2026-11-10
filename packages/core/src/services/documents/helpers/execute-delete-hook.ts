import type {
	CollectionTableNames,
	ServiceFn,
} from "../../../exports/types.js";
import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";

const executeDeleteHook: ServiceFn<
	[
		{
			event: "beforeDelete" | "afterDelete";
			collection: CollectionDefinition;
			collectionKey: string;
			tableNames: CollectionTableNames;
			userId: number | null;
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

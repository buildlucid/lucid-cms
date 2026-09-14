import collections from "../../../libs/collection/collections.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { ToolkitDocumentsNotifyChangeInput } from "../../../libs/toolkit/documents/notify-change/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Runs change subscribers in the caller's context. IDs need not still exist. */
const notifyChange: ServiceFn<
	[ToolkitDocumentsNotifyChangeInput],
	undefined
> = async (context, data) => {
	const ids = [...new Set(data.ids)];
	if (ids.length === 0) return { error: undefined, data: undefined };

	const collection = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collection.error) return collection;

	return executeHooks(
		context,
		{
			service: "documents",
			event: "afterChange",
			config: context.config,
			collectionInstance: collection.data,
		},
		{
			meta: { collectionKey: data.collectionKey, collection: collection.data },
			data: { ids, ...(data.change ? { change: data.change } : {}) },
		},
	);
};

export default notifyChange;

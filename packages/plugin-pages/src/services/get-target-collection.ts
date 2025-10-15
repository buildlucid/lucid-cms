import T from "../translations/index.js";
import type { ServiceResponse } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	PluginOptionsInternal,
} from "../types/types.js";

/**
 *  Fetches the target collection from the plugin options
 */
const getTargetCollection = (data: {
	options: PluginOptionsInternal;
	collectionKey: string;
}): Awaited<ServiceResponse<CollectionConfig>> => {
	const targetCollection = data.options.collections.find(
		(c) => c.collectionKey === data.collectionKey,
	);
	//* should never happen
	if (!targetCollection) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("cannot_find_collection", {
					collection: data.collectionKey,
				}),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: targetCollection,
	};
};

export default getTargetCollection;

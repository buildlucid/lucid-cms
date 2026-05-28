import { serverText } from "@lucidcms/core/plugin";
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
				message: serverText("plugin.pages.collections.not.found", {
					data: {
						collection: data.collectionKey,
					},
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

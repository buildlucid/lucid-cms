import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";

const checkCollection: ServiceFn<
	[
		{
			key: string;
		},
	],
	CollectionBuilder
> = async (context, data) => {
	const collectionInstance = context.config.collections?.find(
		(c) => c.key === data.key,
	);

	if (!collectionInstance) {
		return {
			error: {
				type: "basic",
				message: T("collection_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: collectionInstance,
	};
};

export default checkCollection;

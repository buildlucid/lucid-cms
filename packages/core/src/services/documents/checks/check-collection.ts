import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { text } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

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
				message: text.server("core.collections.not.found.message"),
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

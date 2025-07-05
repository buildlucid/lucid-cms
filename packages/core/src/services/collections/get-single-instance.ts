import T from "../../translations/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";

const getSingleInstance = (
	context: ServiceContext,
	data: {
		key: string;
		instance?: CollectionBuilder;
	},
): Awaited<ServiceResponse<CollectionBuilder>> => {
	const collection =
		data.instance ??
		context.config.collections?.find((c) => c.key === data.key);

	if (collection === undefined) {
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
		data: collection,
	};
};

export default getSingleInstance;

import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../libs/i18n/index.js";
import { tenantAccessAllowed } from "../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";

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
				message: copy("server:core.collections.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (
		!tenantAccessAllowed(
			collection.getData.config.tenantKeys,
			context.request.tenantKey,
		)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.not.found.message"),
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

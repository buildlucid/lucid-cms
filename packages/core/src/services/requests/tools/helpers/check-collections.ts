import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../../utils/services/types.js";

/** Treats requests with documents outside a tool's collections as not found. */
const checkCollections = (data: {
	collectionKeys: string[];
	allowedCollectionKeys: string[];
}): Awaited<ServiceResponse<undefined>> =>
	data.collectionKeys.every((key) => data.allowedCollectionKeys.includes(key))
		? { error: undefined, data: undefined }
		: {
				error: {
					type: "basic",
					message: copy("server:core.requests.not.found"),
					status: 404,
				},
				data: undefined,
			};

export default checkCollections;

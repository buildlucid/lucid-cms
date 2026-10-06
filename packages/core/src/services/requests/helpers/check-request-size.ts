import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const checkRequestSize = (
	documentCount: number,
): Awaited<ServiceResponse<undefined>> => {
	if (documentCount > constants.requests.maxDocuments) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.limit.documents", {
					data: { limit: constants.requests.maxDocuments },
				}),
				status: 413,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkRequestSize;

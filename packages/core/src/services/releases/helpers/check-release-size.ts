import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const checkReleaseSize = (
	documentCount: number,
): Awaited<ServiceResponse<undefined>> => {
	if (documentCount > constants.releases.maxDocuments) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.limit.documents", {
					data: { limit: constants.releases.maxDocuments },
				}),
				status: 413,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkReleaseSize;

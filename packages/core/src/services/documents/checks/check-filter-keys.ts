import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** Rejects unknown filter keys to prevent accidentally unfiltered results. */
const checkFilterKeys = (
	unknownKeys: string[],
): Awaited<ServiceResponse<undefined>> => {
	const key = unknownKeys[0];
	if (key === undefined) {
		return { error: undefined, data: undefined };
	}

	return {
		error: {
			type: "basic",
			message: copy("server:core.documents.filter.key.unknown", {
				data: { key },
			}),
			status: 400,
		},
		data: undefined,
	};
};

export default checkFilterKeys;

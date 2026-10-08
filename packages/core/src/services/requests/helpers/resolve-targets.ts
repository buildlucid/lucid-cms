import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { RequestType } from "../../../libs/db/tables/requests.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import getAllowedTargets from "./get-allowed-targets.js";

/** Validates selected publish or unpublish targets and rejects targets for delete requests. */
const resolveTargets = (data: {
	collection: CollectionBuilder;
	type: Exclude<RequestType, "create">;
	source: string | null;
	targets: string[];
}): Awaited<ServiceResponse<string[]>> => {
	const targets = [...new Set(data.targets)];
	const allowed = getAllowedTargets(data);
	if (
		(data.type !== "delete" && targets.length === 0) ||
		targets.some((target) => !allowed.includes(target))
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.targets.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: targets };
};

export default resolveTargets;

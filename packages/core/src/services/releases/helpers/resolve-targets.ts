import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import getAllowedTargets from "./get-allowed-targets.js";

/** Checks the explicitly selected publication environments. */
const resolveTargets = (data: {
	collection: CollectionBuilder;
	source: string;
	targets: string[];
}): Awaited<ServiceResponse<string[]>> => {
	const targets = [...new Set(data.targets)];
	const allowed = getAllowedTargets(data.collection, data.source);
	if (
		data.targets.includes("latest") ||
		targets.length === 0 ||
		targets.some((target) => !allowed.includes(target))
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.targets.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: targets };
};

export default resolveTargets;

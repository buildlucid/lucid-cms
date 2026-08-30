import type { Refs } from "../../exports/types.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import { refResourceKeys } from "./constants.js";
import type {
	RefResolvers,
	RefResourceSelection,
	RefTargets,
} from "./types.js";

const resolveRefs = async (data: {
	targets: RefTargets;
	resolvers: RefResolvers;
}): ServiceResponse<Refs> => {
	const resources = refResourceKeys.flatMap((resource) => {
		const targets = data.targets[resource];
		return targets?.size ? [{ resource, targets }] : [];
	});
	const results = await Promise.all(
		resources.map(({ resource, targets }) => data.resolvers[resource](targets)),
	);

	const refs: Refs = {};
	for (const result of results) {
		if (result.error) return result;
		Object.assign(refs, result.data);
	}

	return {
		error: undefined,
		data: refs,
	};
};

export const selectRefs = (
	refs: Refs,
	selection: RefResourceSelection,
): Refs | undefined => {
	if (selection === null) return undefined;
	if (selection === "all") return refs;

	const selected: Refs = {};
	for (const resource of selection) {
		const resourceRefs = refs[resource];
		if (resourceRefs) Object.assign(selected, { [resource]: resourceRefs });
	}
	return selected;
};

export default resolveRefs;

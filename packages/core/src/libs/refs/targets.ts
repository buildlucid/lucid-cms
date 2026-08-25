import type { RefTarget, RefTargets } from "./types.js";

/** Adds a target to the resource and table buckets, deduplicating its value. */
export const addRefTarget = (targets: RefTargets, target: RefTarget) => {
	let resourceTargets = targets[target.resource];
	if (!resourceTargets) {
		resourceTargets = new Map();
		targets[target.resource] = resourceTargets;
	}

	const tableTargets = resourceTargets.get(target.table) ?? new Set<unknown>();
	tableTargets.add(target.value);
	resourceTargets.set(target.table, tableTargets);
};

export const shouldIncludeRefResource = (
	resource: RefTarget["resource"],
	resources?: RefTarget["resource"][],
) => resources === undefined || resources.includes(resource);

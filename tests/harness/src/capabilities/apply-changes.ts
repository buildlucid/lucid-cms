import type { Capability, CapabilityChanges } from "./types.ts";

/** Applies each set of changes in turn, so later ones win, and returns a sorted list without repeats. */
const applyChanges = (
	capabilities: readonly Capability[],
	...changes: CapabilityChanges[]
): Capability[] => {
	const result = new Set(capabilities);
	for (const change of changes) {
		for (const capability of change.add ?? []) {
			result.add(capability);
		}
		for (const capability of change.remove ?? []) {
			result.delete(capability);
		}
	}
	return [...result].sort();
};

export default applyChanges;

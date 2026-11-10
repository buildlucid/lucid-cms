import type { Lane } from "../lanes/types.ts";
import { MODES, type Setup } from "../setup/types.ts";
import profiles from "./profiles.ts";
import type { PlanFilters, SetupPlan } from "./types.ts";

/** Keeps the named items, or all of them when no names are given. Unknown names are an error. */
const select = <Item>(
	kind: string,
	items: readonly Item[],
	names: string[],
	getName: (item: Item) => string,
): Item[] => {
	if (names.length === 0) {
		return [...items];
	}

	const known = items.map(getName);
	const unknown = names.filter((name) => !known.includes(name));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown ${kind}: ${unknown.join(", ")}. Choose from ${known.join(", ")}.`,
		);
	}
	return items.filter((item) => names.includes(getName(item)));
};

/**
 * Works out every lane run for the chosen setups. A lane runs against a setup once for each
 * mode they both support.
 */
const createPlan = (options: {
	setups: readonly Setup[];
	lanes: readonly Lane[];
	filters: PlanFilters;
}): SetupPlan[] => {
	const { filters } = options;
	const setups = select("setup", options.setups, filters.setups, (s) => s.name);
	const lanes = select("lane", options.lanes, filters.lanes, (l) => l.key);
	const modes = select("mode", MODES, filters.modes, (mode) => mode);

	return setups
		.map((setup) => ({
			setup,
			jobs: lanes.flatMap((lane) =>
				modes
					.filter(
						(mode) => setup.modes.includes(mode) && lane.modes.includes(mode),
					)
					.map((mode) => ({ setup, lane, mode }))
					.filter(profiles[filters.profile]),
			),
		}))
		.filter((plan) => plan.jobs.length > 0);
};

export default createPlan;

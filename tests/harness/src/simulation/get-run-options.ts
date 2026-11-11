import loadContext from "../environment/load-context.ts";

/** Returns seed and sequence count as `fc.assert` options for tests using fast-check directly. */
const getRunOptions = (): { seed: number; numRuns: number } => {
	const context = loadContext();
	return { seed: context.seed, numRuns: context.simulationRuns };
};

export default getRunOptions;

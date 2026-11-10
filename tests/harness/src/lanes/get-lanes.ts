import e2eLane from "./e2e.ts";
import integrationLane from "./integration.ts";
import performanceLane from "./performance.ts";
import simulationLane from "./simulation.ts";
import type { Lane } from "./types.ts";

/** Every lane the harness can run. Add a lane here and give it a folder in `suites`. */
const lanes: readonly Lane[] = [
	integrationLane,
	e2eLane,
	simulationLane,
	performanceLane,
];

export default lanes;

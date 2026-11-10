import createVitestLane from "./vitest/create-vitest-lane.ts";

const integrationLane = createVitestLane({
	key: "integration",
	description: "Features exercised over the HTTP API.",
	modes: ["host", "served"],
});

export default integrationLane;

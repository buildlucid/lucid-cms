import createVitestLane from "./vitest/create-vitest-lane.ts";

const simulationLane = createVitestLane({
	key: "simulation",
	description:
		"Random sequences of actions, checked against rules that must always hold.",
	//* every sequence starts from a fresh CMS, which only host mode can give
	modes: ["host"],
});

export default simulationLane;

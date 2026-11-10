import path from "node:path";
import { paths } from "../../utils/paths.ts";
import type { Lane } from "../types.ts";

/** Defines a lane that runs `suites/<key>/**\/*.test.ts` with Vitest and the harness fixtures. */
const createVitestLane = (
	lane: Pick<Lane, "key" | "description" | "modes">,
): Lane => ({
	...lane,
	command: (passthrough) => ({
		command: path.join(paths.bin, "vitest"),
		args: [
			"run",
			"--config",
			path.join(paths.harness, "lanes/vitest/vitest.config.ts"),
			...passthrough,
		],
	}),
});

export default createVitestLane;

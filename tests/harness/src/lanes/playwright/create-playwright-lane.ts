import path from "node:path";
import { paths } from "../../utils/paths.ts";
import type { Lane } from "../types.ts";

/** Defines a lane that runs `suites/<key>/**\/*.spec.ts` in a browser with Playwright. */
const createPlaywrightLane = (
	lane: Pick<Lane, "key" | "description">,
): Lane => ({
	...lane,
	//* a browser needs a real address to visit
	modes: ["served"],
	command: (passthrough) => ({
		command: path.join(paths.bin, "playwright"),
		args: [
			"test",
			"--config",
			path.join(paths.harness, "lanes/playwright/playwright.config.ts"),
			...passthrough,
		],
	}),
});

export default createPlaywrightLane;

import path from "node:path";
import escapePattern from "../../utils/escape-pattern.ts";
import { paths } from "../../utils/paths.ts";
import type { Lane } from "../types.ts";

/** Defines a lane that runs `suites/<key>/**\/*.spec.ts` in a browser with Playwright. */
const createPlaywrightLane = (
	lane: Pick<Lane, "key" | "description">,
): Lane => ({
	...lane,
	//* a browser needs a real address to visit
	modes: ["served"],
	browser: true,
	command: ({ filters, passthrough }) => ({
		command: path.join(paths.bin, "playwright"),
		args: [
			"test",
			"--config",
			path.join(paths.harness, "lanes/playwright/playwright.config.ts"),
			//* Playwright matches file filters as patterns against the absolute path, ignoring
			//* case. Each one is escaped and tied to the lane's folder, so it cannot match a
			//* folder above the repo
			...filters.files.map(
				(file) =>
					`${escapePattern(path.join(paths.suites, lane.key))}.*${escapePattern(file)}`,
			),
			...(filters.tests.length > 0 ? ["-g", filters.tests.join("|")] : []),
			...passthrough,
		],
	}),
});

export default createPlaywrightLane;

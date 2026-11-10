import path from "node:path";
import { paths } from "../utils/paths.ts";
import type { Lane } from "./types.ts";

const performanceLane: Lane = {
	key: "performance",
	description:
		"Measurements of the project itself, such as how long a build takes.",
	//* it measures the setup's folder, so no CMS or database is prepared
	modes: ["project"],
	exclusive: true,
	command: (passthrough) => ({
		command: process.execPath,
		args: [
			path.join(paths.harness, "lanes/performance/run.ts"),
			...passthrough,
		],
	}),
};

export default performanceLane;

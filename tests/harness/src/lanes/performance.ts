import path from "node:path";
import { paths } from "../utils/paths.ts";
import type { Lane } from "./types.ts";

const performanceLane: Lane = {
	key: "performance",
	description:
		"Measurements of the project itself, such as how long a build or a migration takes.",
	//* it measures the setup's folder, so no CMS or template database is prepared
	modes: ["project"],
	exclusive: true,
	//* benchmarks that time migrations create empty databases of their own
	database: true,
	command: ({ filters, passthrough }) => ({
		command: process.execPath,
		args: [
			path.join(paths.harness, "lanes/performance/run.ts"),
			...filters.files.flatMap((file) => ["--file", file]),
			...filters.tests.flatMap((test) => ["--test", test]),
			...passthrough,
		],
	}),
};

export default performanceLane;

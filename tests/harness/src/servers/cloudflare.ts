import path from "node:path";
import { paths } from "../utils/paths.ts";
import { startCommand } from "../utils/run-command.ts";
import type { ServerLauncher } from "./types.ts";

/**
 * Runs the built Worker in workerd through `lucidcms serve`, which also builds it.
 * The setup's config reads its port from `HARNESS_PORT`.
 */
const OUTPUT = ".cloudflare/output/v0/workers/default";

const cloudflareLauncher: ServerLauncher = {
	output: { root: OUTPUT, assets: `${OUTPUT}/assets` },
	build: async () => {},
	start: (options) =>
		startCommand({
			command: path.join(paths.bin, "lucidcms"),
			args: ["serve"],
			cwd: options.setup.directory,
			env: {
				...options.env,
				HARNESS_PORT: String(options.port),
				CI: "true",
			},
			output: options.log,
		}),
};

export default cloudflareLauncher;

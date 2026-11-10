import { startCommand } from "../utils/run-command.ts";
import runLucidCli from "./run-lucid-cli.ts";
import type { ServerLauncher } from "./types.ts";

/** Builds with `lucidcms build`, then runs the built Node server as a deployment would. */
const nodeLauncher: ServerLauncher = {
	output: { root: "dist", assets: "dist/public" },
	build: (options) => runLucidCli(["build"], options),
	start: (options) =>
		startCommand({
			command: process.execPath,
			args: ["dist/server.js"],
			cwd: options.setup.directory,
			env: {
				...options.env,
				PORT: String(options.port),
				HOST: "127.0.0.1",
				NODE_ENV: "production",
			},
			output: options.log,
		}),
};

export default nodeLauncher;

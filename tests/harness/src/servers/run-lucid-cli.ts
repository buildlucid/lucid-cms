import path from "node:path";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import type { ServerOptions } from "./types.ts";

/** Runs a `lucidcms` command in a setup's folder, and throws when it fails. */
const runLucidCli = async (
	args: string[],
	options: ServerOptions,
): Promise<void> => {
	const code = await runCommand({
		command: path.join(paths.bin, "lucidcms"),
		args,
		cwd: options.setup.directory,
		//* CI stops the CLI drawing spinners into the log
		env: { ...options.env, CI: "true" },
		output: options.log,
	});

	if (code !== 0) {
		throw new Error(
			`"lucidcms ${args.join(" ")}" failed for ${options.setup.name}. See ${options.log}`,
		);
	}
};

export default runLucidCli;

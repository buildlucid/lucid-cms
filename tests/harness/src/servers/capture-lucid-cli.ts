import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { CliRun } from "../migrations/types.ts";
import type { Setup } from "../setup/types.ts";
import { paths } from "../utils/paths.ts";
import { type RunningCommand, startCommand } from "../utils/run-command.ts";

/**
 * Runs a CLI command without a terminal and returns its outcome. Tracks it in `running` so test
 * cleanup can stop hung commands.
 */
const captureLucidCli = async (options: {
	setup: Pick<Setup, "directory">;
	args: string[];
	env: Record<string, string>;
	log: string;
	running?: Set<RunningCommand>;
}): Promise<CliRun> => {
	const command = await startCommand({
		command: path.join(paths.bin, "lucidcms"),
		args: options.args,
		cwd: options.setup.directory,
		//* CI stops the CLI drawing spinners into the log
		env: { ...options.env, CI: "true" },
		output: options.log,
	});
	options.running?.add(command);
	const code = await command.exit.finally(() =>
		options.running?.delete(command),
	);

	return {
		code,
		output: stripVTControlCharacters(await readFile(options.log, "utf8")),
	};
};

export default captureLucidCli;

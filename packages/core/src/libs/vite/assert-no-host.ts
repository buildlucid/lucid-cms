import { LucidError } from "../../utils/errors/index.js";
import findHostCli from "./find-host-cli.js";

/** Throws when a framework serves the project instead of Lucid's server commands, naming the framework's commands. */
const assertNoHost = async (projectRoot: string) => {
	const cli = await findHostCli(projectRoot);
	if (!cli) return;

	throw new LucidError({
		message: `${cli.name} serves Lucid in this project. Use \`${cli.commands.dev}\`, \`${cli.commands.build}\` and \`${cli.commands.preview}\` instead.`,
	});
};

export default assertNoHost;

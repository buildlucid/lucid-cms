import { LucidError } from "../../utils/errors/index.js";
import type { HostAdapter } from "../runtime/types.js";
import loadHostCli from "./load-host-cli.js";

/** Throws when the project declares a host, which serves Lucid instead of Lucid's server commands, naming its commands. */
const assertNoHost = async (
	host: HostAdapter | undefined,
	projectRoot: string,
) => {
	if (!host) return;
	const cli = await loadHostCli(host, projectRoot);
	throw new LucidError({
		message: `${cli.name} serves Lucid in this project. Use \`${cli.commands.dev}\`, \`${cli.commands.build}\` and \`${cli.commands.preview}\` instead.`,
	});
};

export default assertNoHost;

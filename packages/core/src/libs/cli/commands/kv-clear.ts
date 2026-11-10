import cliLogger from "../logger.js";
import confirmCommand from "../services/confirm-command.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Clears Lucid's KV keys, such as cached responses, rate limits and stored site pages, after confirming unless `--yes` is passed. */
const kvClearCommand = (options?: { yes?: boolean } & TaskServerOptions) =>
	runTaskCommand(
		"KV clear failed",
		async (run, elapsed) => {
			const proceed = await confirmCommand({
				message:
					"Clear the KV store? This removes cached responses, rate limits and stored site pages.",
				yes: options?.yes,
			});
			if (!proceed) {
				cliLogger.info("KV clear cancelled");
				return 0;
			}

			const { adapter } = await run("kv:clear", {});
			if (adapter === "passthrough") {
				cliLogger.warn(
					"No KV adapter is configured, so there was nothing to clear.",
				);
				return 0;
			}

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`KV cleared through the "${adapter}" adapter`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default kvClearCommand;

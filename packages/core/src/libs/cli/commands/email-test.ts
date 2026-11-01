import z from "zod";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../logger.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

const emailTestCommand = (to: string, options?: TaskServerOptions) =>
	runTaskCommand(
		"Test email failed",
		async (run, elapsed) => {
			if (!z.email().safeParse(to).success) {
				throw new LucidError({ message: `"${to}" isn't an email address.` });
			}

			const result = await run("email:test", { to });
			if (result.status === "failed") {
				cliLogger.error(
					`The "${result.adapter}" adapter couldn't send the test email`,
				);
				if (result.message) {
					cliLogger.log(result.message, { indent: 2, symbol: "child" });
				}
				return 1;
			}
			if (result.simulated) {
				cliLogger.warn(
					`The test email to ${to} was simulated, so nothing was sent. Configure an email adapter and turn off email.simulate to send email.`,
				);
				return 0;
			}

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`Test email sent to ${to} through the "${result.adapter}" adapter`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default emailTestCommand;

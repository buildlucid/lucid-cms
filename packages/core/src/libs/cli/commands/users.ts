import confirm from "@inquirer/confirm";
import type { RuntimeTaskClient } from "../../vite/create-task-client.js";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

type UserCommandOptions = { force?: boolean } & TaskServerOptions;

/** Runs a change to a user in the runtime, after confirming unless forced. */
const runUserCommand = (props: {
	failure: string;
	question: string;
	success: string;
	options?: UserCommandOptions;
	change: (run: RuntimeTaskClient) => Promise<unknown>;
}) =>
	runTaskCommand(
		props.failure,
		async (run, elapsed) => {
			const proceed =
				props.options?.force ||
				(await runPrompt((output) =>
					confirm({ message: props.question, default: false }, { output }),
				));
			if (!proceed) {
				cliLogger.info("Cancelled");
				return 0;
			}

			await props.change(run);

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				props.success,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		props.options,
	);

/** Turns off a user's two-factor authentication, for when they've lost their app and recovery codes and nobody can reset it in the admin. */
export const usersResetTwoFactorCommand = (
	email: string,
	options?: UserCommandOptions,
) =>
	runUserCommand({
		failure: "Two-factor reset failed",
		question: `Turn off two-factor authentication for ${email}?`,
		success: `Two-factor authentication turned off for ${email}`,
		options,
		change: (run) => run("users:reset-two-factor", { email }),
	});

/** Makes a user a super admin, for when no super admin can log in. */
export const usersSuperAdminCommand = (
	email: string,
	options?: UserCommandOptions,
) =>
	runUserCommand({
		failure: "Super admin change failed",
		question: `Make ${email} a super admin?`,
		success: `${email} made a super admin`,
		options,
		change: (run) => run("users:super-admin", { email }),
	});

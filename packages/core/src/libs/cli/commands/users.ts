import type { RuntimeTaskClient } from "../../vite/create-task-client.js";
import cliLogger from "../logger.js";
import confirmCommand from "../services/confirm-command.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

type UserCommandOptions = { yes?: boolean } & TaskServerOptions;

/** Runs a change to a user in the runtime, after confirming unless `--yes` is passed. */
const runUserCommand = (props: {
	failure: string;
	question: string;
	success: string;
	options?: UserCommandOptions;
	/** Makes the change. A returned line is shown after the success message. */
	change: (run: RuntimeTaskClient) => Promise<string | undefined>;
}) =>
	runTaskCommand(
		props.failure,
		async (run, elapsed) => {
			const proceed = await confirmCommand({
				message: props.question,
				yes: props.options?.yes,
			});
			if (!proceed) {
				cliLogger.info("Cancelled");
				return 0;
			}

			const note = await props.change(run);

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				props.success,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: note === undefined, spaceBefore: true },
			);
			if (note !== undefined) cliLogger.info(note, { spaceAfter: true });
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
		change: async (run) => {
			await run("users:reset-two-factor", { email });
			return undefined;
		},
	});

/** Removes all of a user's passkeys, such as when a device is lost and nobody can reset them in the admin. */
export const usersResetPasskeysCommand = (
	email: string,
	options?: UserCommandOptions,
) =>
	runUserCommand({
		failure: "Passkey reset failed",
		question: `Remove all passkeys for ${email}?`,
		success: `Passkeys removed for ${email}`,
		options,
		change: async (run) => {
			await run("users:reset-passkeys", { email });
			return undefined;
		},
	});

/** Gives a user a temporary password, which they have to change when they next log in. */
export const usersResetPasswordCommand = (
	email: string,
	options?: UserCommandOptions,
) =>
	runUserCommand({
		failure: "Password reset failed",
		question: `Give ${email} a temporary password? Their current one stops working.`,
		success: `Password reset for ${email}`,
		options,
		change: async (run) => {
			const { password } = await run("users:reset-password", { email });
			return `Temporary password: ${cliLogger.color.cyan(password)}. They'll be asked to change it when they log in.`;
		},
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
		change: async (run) => {
			await run("users:super-admin", { email });
			return undefined;
		},
	});

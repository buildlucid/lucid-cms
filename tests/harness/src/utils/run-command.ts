import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export type CommandOptions = {
	command: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
	/** A file that collects the command's output, or "inherit" to show it live. */
	output: string | "inherit";
};

export type RunningCommand = {
	/** Resolves with the exit code once the command ends. */
	exit: Promise<number>;
	/** Stops the command and waits for it to end. */
	stop(): Promise<void>;
};

/** How long a command gets to shut down cleanly before it is killed. */
const STOP_GRACE_MS = 3000;

/** Starts a command with the harness's environment plus its own, sending output to a log file or the terminal. */
export const startCommand = async (
	options: CommandOptions,
): Promise<RunningCommand> => {
	let log: ReturnType<typeof createWriteStream> | undefined;
	if (options.output !== "inherit") {
		await mkdir(path.dirname(options.output), { recursive: true });
		log = createWriteStream(options.output, { flags: "a" });
	}

	const child = spawn(options.command, options.args, {
		cwd: options.cwd,
		env: { ...process.env, ...options.env },
		stdio: log ? ["ignore", "pipe", "pipe"] : "inherit",
	});
	if (log) {
		child.stdout?.pipe(log, { end: false });
		child.stderr?.pipe(log, { end: false });
	}

	const exit = new Promise<number>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (code) => {
			log?.end();
			resolve(code ?? 1);
		});
	});

	return {
		exit,
		stop: async () => {
			if (child.exitCode !== null || child.signalCode !== null) {
				return;
			}

			child.kill("SIGTERM");
			const forced = setTimeout(() => child.kill("SIGKILL"), STOP_GRACE_MS);
			await exit.catch(() => undefined);
			clearTimeout(forced);
		},
	};
};

/** Runs a command to the end and returns its exit code. */
export const runCommand = async (options: CommandOptions): Promise<number> =>
	(await startCommand(options)).exit;

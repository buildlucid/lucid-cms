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

/** Every command this process started that is still running, so they can all be stopped at once. */
const running = new Set<RunningCommand>();

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
		//* no input, as a command in its own process group may not read the terminal
		stdio: ["ignore", log ? "pipe" : "inherit", log ? "pipe" : "inherit"],
		//* its own process group, so stopping it also stops what it started, such as test workers
		detached: true,
	});
	/** Signals the command and everything it started. */
	const signal = (name: NodeJS.Signals) => {
		if (!child.pid) {
			return;
		}
		try {
			process.kill(-child.pid, name);
		} catch {
			// the group has already gone
		}
	};
	if (log) {
		child.stdout?.pipe(log, { end: false });
		child.stderr?.pipe(log, { end: false });
	}

	const exit = new Promise<number>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (code) => {
			//* waits for the log to be written in full, as callers read it once the command ends
			if (log) {
				log.end(() => resolve(code ?? 1));
			} else {
				resolve(code ?? 1);
			}
		});
	});

	const command: RunningCommand = {
		exit,
		stop: async () => {
			signal("SIGTERM");
			//* what it started may outlive it, so the group is signalled either way
			if (child.exitCode !== null || child.signalCode !== null) {
				return;
			}

			const forced = setTimeout(() => signal("SIGKILL"), STOP_GRACE_MS);
			await exit.catch(() => undefined);
			clearTimeout(forced);
		},
	};
	running.add(command);
	void exit.finally(() => running.delete(command)).catch(() => undefined);
	return command;
};

/** Runs a command to the end and returns its exit code. */
export const runCommand = async (options: CommandOptions): Promise<number> =>
	(await startCommand(options)).exit;

/** Stops every command still running, such as when the run is cancelled. */
export const stopAllCommands = async (): Promise<void> => {
	await Promise.all([...running].map((command) => command.stop()));
};

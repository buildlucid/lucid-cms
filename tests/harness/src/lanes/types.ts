import type { Mode } from "../setup/types.ts";

/**
 * Test command with suites in `suites/<key>`. Reads setup context from `HARNESS_CONTEXT` and
 * writes results with `writeLaneResult`.
 */
export type Lane = {
	key: string;
	/** One line on what it covers, shown in listings. */
	description: string;
	/** The modes its tests can run in. It runs once for each one a setup also supports. */
	modes: readonly Mode[];
	/**
	 * Runs alone, one setup at a time, after every other lane has finished.
	 * For lanes that measure, where anything else running would skew the numbers.
	 */
	exclusive?: boolean;
	/** The command that runs it from the `tests` folder. `passthrough` holds extra arguments from the terminal. */
	command(passthrough: string[]): { command: string; args: string[] };
};

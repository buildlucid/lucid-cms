import type { JobFilters } from "../cli/types.ts";
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
	/** Drives a browser, so Playwright's browser must be installed. */
	browser?: boolean;
	/**
	 * Uses the setup's database even in project mode, so the service behind it is started.
	 * For lanes that create their own databases, such as to time migrations.
	 */
	database?: boolean;
	/**
	 * The command that runs it from the `tests` folder, narrowed to the files and tests in
	 * `filters`. `passthrough` holds extra arguments from the terminal.
	 */
	command(options: { filters: JobFilters; passthrough: string[] }): {
		command: string;
		args: string[];
	};
};

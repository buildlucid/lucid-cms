import { appendFileSync } from "node:fs";
import loadContext from "../environment/load-context.ts";
import type { ProgressEventBody } from "./types.ts";

/**
 * Appends an event to the job's events file. Any process of a lane run may call it, such as a
 * reporter or a test worker. Progress is only for display, so a failed write is ignored.
 */
const emitProgress = (event: ProgressEventBody): void => {
	try {
		//* one write per line, so lines from several processes never interleave
		appendFileSync(
			loadContext().paths.events,
			`${JSON.stringify({ ...event, at: Date.now() })}\n`,
		);
	} catch {
		// progress is best effort
	}
};

export default emitProgress;

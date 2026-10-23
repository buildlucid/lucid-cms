import createConsoleTransport from "../logger/console-transport/index.js";
import { writeBufferedLog } from "../logger/index.js";
import type { LogEntry } from "../logger/types.js";

const logLevels = new Set(["error", "warn", "info", "debug"]);
const transport = createConsoleTransport();
/** Entries with a `dedupeKey` printed by this process, so a warning shows once per session rather than per restart. */
const printed = new Set<string>();

/** Checks a hot channel payload is a runtime log entry, which arrives as JSON. */
const isLogEntry = (value: unknown): value is LogEntry =>
	typeof value === "object" &&
	value !== null &&
	"level" in value &&
	typeof value.level === "string" &&
	logLevels.has(value.level) &&
	"message" in value &&
	typeof value.message === "string" &&
	"timestamp" in value &&
	typeof value.timestamp === "string" &&
	"owner" in value &&
	typeof value.owner === "string";

/** Prints a runtime log entry that a server environment sent over its hot channel, after any CLI output being buffered. */
const writeRuntimeLog = (entry: unknown) => {
	if (!isLogEntry(entry)) return;
	if (entry.dedupeKey !== undefined) {
		const key = JSON.stringify([entry.owner, entry.dedupeKey]);
		if (printed.has(key)) return;
		printed.add(key);
	}
	writeBufferedLog(() => transport.write(entry));
};

export default writeRuntimeLog;

import constants from "../../constants/constants.js";
import type { LogTransport } from "./types.js";

/** The part of Vite's `import.meta.hot` the transport sends through. */
type HotSender = { send: (event: string, data?: unknown) => void };

/** Sends JSON runtime logs through the server's hot channel for terminal output, preserving error names, messages and stacks. */
const createHotLogTransport = (hot: HotSender): LogTransport => ({
	write: (entry) => {
		hot.send(constants.dev.logEvent, {
			...entry,
			error:
				entry.error instanceof Error
					? {
							name: entry.error.name,
							message: entry.error.message,
							stack: entry.error.stack,
						}
					: entry.error,
		});
	},
});

export default createHotLogTransport;

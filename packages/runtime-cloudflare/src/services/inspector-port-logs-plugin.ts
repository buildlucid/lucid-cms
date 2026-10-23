import { stripVTControlCharacters } from "node:util";
import type { Logger, Plugin } from "vite";

/** Cloudflare's warning when another Worker holds the default debugger port, such as the dev server beside a command's task server. */
const inspectorPortMessage = /Default inspector port \d+ not available/;
/** Tracks filtered loggers so dev restarts do not wrap the same custom logger again. */
const filtered = new WeakSet<Logger>();

/** Leaves out Cloudflare's debugger port warning, which only means the debugger moved to another port. */
const inspectorPortLogsPlugin = (): Plugin => ({
	name: "lucid:cloudflare-inspector-port-logs",
	configResolved(config) {
		if (filtered.has(config.logger)) return;
		filtered.add(config.logger);

		const warn = config.logger.warn;
		config.logger.warn = (message, options) => {
			if (inspectorPortMessage.test(stripVTControlCharacters(message))) return;
			warn(message, options);
		};
	},
});

export default inspectorPortLogsPlugin;

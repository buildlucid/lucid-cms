import { pino } from "pino";
import type { DestinationStream } from "pino";

let activePinoLogger = pino({
	level: "info",
});

/**
 * Initialise the pino logger with optional custom transport
 */
export const initialiseLogger = (
	transport?: DestinationStream,
	level?: "info" | "debug" | "warn" | "error",
) => {
	if (transport) {
		activePinoLogger = pino(
			{
				level: level || "info",
			},
			transport,
		);
	} else {
		if (level) {
			activePinoLogger.level = level;
		}
	}
};

/**
 * Get the current active pino logger instance
 */
const getLogger = () => activePinoLogger;

export default getLogger;

import type { Config } from "../../types.js";
import type { QueueEventHandlers } from "./types.js";

/**
 * Constructs and returns the event handlers for the queue adapters
 */
const eventHandlers = (config: Config): QueueEventHandlers => {
	return {
		// ...config.queues.eventHandlers
		"email:resend": async (context, data) => {
			console.log("email:resend", data);

			return {
				data: undefined,
				error: undefined,
			};
		},
		"media:delete": async (context, data) => {
			console.log("media:delete", data);

			return {
				data: undefined,
				error: undefined,
			};
		},
	};
};

export default eventHandlers;

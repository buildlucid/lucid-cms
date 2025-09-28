import type { Config } from "../../types.js";
import type { QueueEventHandlers } from "./types.js";

/**
 * Constructs and returns the event handlers for the queue adapters
 */
const eventHandlers = (config: Config): QueueEventHandlers => {
	return {
		// ...config.queues.eventHandlers
		"email:resend": async (data) => {
			console.log("email:resend", data);
		},
		"media:delete": async (data) => {
			console.log("media:delete", data);
		},
	};
};

export default eventHandlers;

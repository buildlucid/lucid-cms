import type { Config } from "../../types.js";
import type { QueueEvent, QueueEventStatus, QueueEventID } from "./types.js";
import logger from "../logger/index.js";
import queueEventHandlers from "./event-handlers.js";

/**
 * Responsible for creating the context for the queue adapters.
 */
const createQueueContext = (config: Config) => {
	const eventHandlers = queueEventHandlers(config);

	return {
		/**
		 * Responsible for adding an event to the queue.
		 * - Inserts event into the database
		 * - If KV is enabled, then also inserts into the KV
		 * - Logs the event
		 * */
		addEvent: async (
			event: QueueEvent,
			payload: unknown,
			status: QueueEventStatus,
		) => {
			//* insert event into the database, if KV is enabled, then also insert into the KV
			console.log("addEvent", event, payload, status);
		},
		/**
		 * Responsible for updating an event in the queue.
		 * - Updates event in the database
		 * - If KV is enabled, then also updates in the KV
		 * - Logs the event
		 * */
		updateEvent: async (
			id: QueueEventID,
			status: QueueEventStatus,
			error?: string,
		) => {
			console.log("updateEvent", id, status, error);
		},
		/**
		 * Responsible for getting the event handler for the given event
		 */
		getEventHandler: (event: QueueEvent) => {
			return eventHandlers[event];
		},
		/**
		 * A logging helper
		 * */
		log: (message: string, data?: Record<string, unknown>) => {
			logger.info({
				message,
				data,
				scope: "queue",
			});
		},
	};
};

export default createQueueContext;

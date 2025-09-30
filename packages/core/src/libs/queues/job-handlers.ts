import type { QueueJobHandlers } from "./types.js";
import sendEmailJob from "../../services/email/jobs/send-email.js";

/**
 * Constructs and returns the job handlers for the queue adapters
 */
const jobHandlers = (params: {
	additionalHandlers?: QueueJobHandlers;
}): QueueJobHandlers => {
	return {
		"email:send": sendEmailJob,
		"media:delete": async (context, data) => {
			console.log("media:delete", data);

			return {
				data: undefined,
				error: undefined,
			};
		},
		...params.additionalHandlers,
	};
};

export default jobHandlers;

import type { QueueJobHandlers } from "./types.js";
import sendEmailJob from "../../services/email/jobs/send-email.js";
import hardDeleteSingleMediaJob from "../../services/media/jobs/hard-delete-single.js";

/**
 * Constructs and returns the job handlers for the queue adapters
 */
const jobHandlers = (params: {
	additionalHandlers?: QueueJobHandlers;
}): QueueJobHandlers => {
	return {
		"email:send": sendEmailJob,
		"media:delete": hardDeleteSingleMediaJob,
		...params.additionalHandlers,
	};
};

export default jobHandlers;

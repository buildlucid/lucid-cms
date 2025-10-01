import type { QueueJobHandlers } from "./types.js";
import sendEmailJob from "../../services/email/jobs/send-email.js";
import hardDeleteSingleMediaJob from "../../services/media/jobs/hard-delete-single.js";
import deleteAwaitingSyncMediaJob from "../../services/media/jobs/delete-awaiting-sync.js";

/**
 * Constructs and returns the job handlers for the queue adapters
 */
const jobHandlers = (params: {
	additionalHandlers?: QueueJobHandlers;
}): QueueJobHandlers => {
	return {
		"email:send": sendEmailJob,
		"media:delete": hardDeleteSingleMediaJob,
		"media:delete-unsynced": deleteAwaitingSyncMediaJob,
		...params.additionalHandlers,
	};
};

export default jobHandlers;

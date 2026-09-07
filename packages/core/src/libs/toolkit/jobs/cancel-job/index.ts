import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { JobCancelResult } from "../../../jobs/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Cancels queued jobs or asks running jobs to stop. */
const cancelJob = (
	context: ServiceContext,
	input: { id: string },
): ServiceResponse<JobCancelResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { cancelJob: cancel } = await import("../../../jobs/cancel.js");

			return cancel(context, data);
		},
		name: {
			key: "core.toolkit.jobs.cancel-job.error.name",
			defaultMessage: "Jobs Toolkit Error",
		},
		message: {
			key: "core.toolkit.jobs.cancel-job.error.message",
			defaultMessage: "Lucid toolkit could not cancel job.",
		},
	});

export default cancelJob;

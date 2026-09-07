import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { JobCancelResult } from "../../../jobs/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Cancels queued jobs or asks running jobs to stop. */
const cancelJobs = (
	context: ServiceContext,
	input: { ids: readonly string[] },
): ServiceResponse<JobCancelResult[]> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { cancelJobs: cancel } = await import("../../../jobs/cancel.js");

			return cancel(context, data);
		},
		name: {
			key: "core.toolkit.jobs.cancel-jobs.error.name",
			defaultMessage: "Jobs Toolkit Error",
		},
		message: {
			key: "core.toolkit.jobs.cancel-jobs.error.message",
			defaultMessage: "Lucid toolkit could not cancel jobs.",
		},
	});

export default cancelJobs;

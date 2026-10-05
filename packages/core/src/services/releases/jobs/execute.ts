import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import execute from "../execute.js";
import ReleaseExecutionError from "../helpers/execution-error.js";
import recordFailure from "../helpers/record-failure.js";

/**
 * Publishes an approved release, now or at its scheduled time. A failed run is
 * recorded on the release instead of retried, so someone can fix it and
 * publish again.
 */
export const executeReleaseJob = defineJob({
	name: "core:execute-release",
	version: 1,
	input: z.object({
		releaseId: z.number().int().positive(),
		revision: z.number().int().positive(),
		userId: z.number().int().positive().nullable(),
	}),
	retry: { type: "none" },
	transaction: true,
	handler: ({ context, input, execution }) =>
		execute(context, {
			id: input.releaseId,
			jobId: execution.jobId,
			revision: input.revision,
			userId: input.userId,
		}),
	onPermanentFailure: async ({ context, failure }) => {
		const diagnostics = failure.error?.cause;
		const failureRes = await serviceWrapper(recordFailure, {
			transaction: true,
		})(context, {
			id: failure.input.releaseId,
			jobId: failure.jobId,
			revision: failure.input.revision,
			userId: failure.input.userId,
			message: failure.errorMessage,
			releaseDocumentId:
				diagnostics instanceof ReleaseExecutionError
					? diagnostics.releaseDocumentId
					: null,
			target:
				diagnostics instanceof ReleaseExecutionError
					? diagnostics.target
					: null,
		});
		if (failureRes.error) throw new LucidAPIError(failureRes.error);
	},
	describe: ({ input }) => ({
		releaseId: input.releaseId,
		revision: input.revision,
	}),
});

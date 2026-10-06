import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import execute from "../execute.js";
import RequestExecutionError from "../helpers/execution-error.js";
import recordFailure from "../helpers/record-failure.js";

/**
 * Publishes an approved request, now or at its scheduled time. A failed run is
 * recorded on the request instead of retried, so someone can fix it and
 * publish again.
 */
export const executeRequestJob = defineJob({
	name: "core:execute-request",
	version: 1,
	input: z.object({
		requestId: z.number().int().positive(),
		revision: z.number().int().positive(),
		userId: z.number().int().positive().nullable(),
	}),
	retry: { type: "none" },
	transaction: true,
	handler: ({ context, input, execution }) =>
		execute(context, {
			id: input.requestId,
			jobId: execution.jobId,
			revision: input.revision,
			userId: input.userId,
		}),
	onPermanentFailure: async ({ context, failure }) => {
		const diagnostics = failure.error?.cause;
		const failureRes = await serviceWrapper(recordFailure, {
			transaction: true,
		})(context, {
			id: failure.input.requestId,
			jobId: failure.jobId,
			revision: failure.input.revision,
			userId: failure.input.userId,
			message: failure.errorMessage,
			requestDocumentId:
				diagnostics instanceof RequestExecutionError
					? diagnostics.requestDocumentId
					: null,
			target:
				diagnostics instanceof RequestExecutionError
					? diagnostics.target
					: null,
		});
		if (failureRes.error) throw new LucidAPIError(failureRes.error);
	},
	describe: ({ input }) => ({
		requestId: input.requestId,
		revision: input.revision,
	}),
});

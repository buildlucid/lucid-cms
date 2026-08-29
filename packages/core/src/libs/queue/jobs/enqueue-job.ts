import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import type {
	AnyJobDefinition,
	JobEnqueueOptions,
	JobInput,
	JobReceipt,
} from "../types.js";
import { enqueueJobs } from "./enqueue-jobs.js";

/** Validates and stores one durable job for execution after commit. */
export const enqueueJob = async <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	data: {
		job: Definition;
		payload: JobInput<Definition>;
		options?: JobEnqueueOptions;
	},
): ServiceResponse<JobReceipt> => {
	const result = await enqueueJobs(context, {
		job: data.job,
		payload: [data.payload],
		options: data.options,
	});
	if (result.error) return result;
	const receipt = result.data[0];
	if (!receipt) {
		return {
			error: { message: copy("server:core.queue.jobs.create.failed") },
			data: undefined,
		};
	}
	return { error: undefined, data: receipt };
};

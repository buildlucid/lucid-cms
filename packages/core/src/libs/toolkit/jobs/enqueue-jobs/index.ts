import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type {
	AnyJobDefinition,
	JobEnqueueOptions,
	JobInput,
	JobReceipt,
} from "../../../jobs/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Validates and stores durable jobs using their registered payload schema. */
const enqueueJobs = <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	input: {
		job: Definition;
		payload: readonly JobInput<Definition>[];
		options?: JobEnqueueOptions;
	},
): ServiceResponse<JobReceipt[]> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { enqueueJobs: enqueue } = await import("../../../jobs/enqueue.js");

			return enqueue(context, {
				job: input.job,
				payload: input.payload,
				options: data.options,
			});
		},
		name: {
			key: "core.toolkit.jobs.enqueue-jobs.error.name",
			defaultMessage: "Jobs Toolkit Error",
		},
		message: {
			key: "core.toolkit.jobs.enqueue-jobs.error.message",
			defaultMessage: "Lucid toolkit could not enqueue jobs.",
		},
	});

export default enqueueJobs;

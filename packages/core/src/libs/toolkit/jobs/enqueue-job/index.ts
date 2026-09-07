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
const enqueueJob = <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	input: {
		job: Definition;
		payload: JobInput<Definition>;
		options?: JobEnqueueOptions;
	},
): ServiceResponse<JobReceipt> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { enqueueJob: enqueue } = await import("../../../jobs/enqueue.js");

			return enqueue(context, {
				job: input.job,
				payload: input.payload,
				options: data.options,
			});
		},
		name: {
			key: "core.toolkit.jobs.enqueue-job.error.name",
			defaultMessage: "Jobs Toolkit Error",
		},
		message: {
			key: "core.toolkit.jobs.enqueue-job.error.message",
			defaultMessage: "Lucid toolkit could not enqueue job.",
		},
	});

export default enqueueJob;

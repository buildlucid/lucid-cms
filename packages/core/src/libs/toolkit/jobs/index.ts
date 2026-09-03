import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { cancelJob, cancelJobs } from "../../jobs/cancel.js";
import { enqueueJob, enqueueJobs } from "../../jobs/enqueue.js";
import type {
	AnyJobDefinition,
	JobCancelResult,
	JobEnqueueOptions,
	JobInput,
	JobReceipt,
} from "../../jobs/types.js";

/** Helpers for enqueueing and cancelling durable jobs. */
export type ToolkitJobs = {
	/** Validates and stores one durable job for execution. */
	enqueueJob: <Definition extends AnyJobDefinition>(input: {
		job: Definition;
		payload: JobInput<Definition>;
		options?: JobEnqueueOptions;
	}) => ServiceResponse<JobReceipt>;
	/** Validates and stores multiple durable jobs in one database write. */
	enqueueJobs: <Definition extends AnyJobDefinition>(input: {
		job: Definition;
		payload: readonly JobInput<Definition>[];
		options?: JobEnqueueOptions;
	}) => ServiceResponse<JobReceipt[]>;
	/** Cancels a queued job or asks a running job to stop. */
	cancelJob: (input: { id: string }) => ServiceResponse<JobCancelResult>;
	/** Cancels multiple jobs and returns each outcome in input order. */
	cancelJobs: (input: {
		ids: readonly string[];
	}) => ServiceResponse<JobCancelResult[]>;
};

/** Creates durable job helpers for a toolkit instance. */
export const createJobsToolkit = (context: ServiceContext): ToolkitJobs => ({
	enqueueJob: (input) => enqueueJob(context, input),
	enqueueJobs: (input) => enqueueJobs(context, input),
	cancelJob: (input) => cancelJob(context, input),
	cancelJobs: (input) => cancelJobs(context, input),
});

export default createJobsToolkit;

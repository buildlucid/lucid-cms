import constants from "../../constants/constants.js";

export { default as defineJob } from "./define-job.js";
export { cancelJob } from "./jobs/cancel-job.js";
export { cancelJobs } from "./jobs/cancel-jobs.js";
export { consumeJob } from "./jobs/consume-job.js";
export { drainJobs } from "./jobs/drain-jobs.js";
export { enqueueJob } from "./jobs/enqueue-job.js";
export { enqueueJobs } from "./jobs/enqueue-jobs.js";
export type {
	AnyJobDefinition,
	DefineJobOptions,
	JobCancelResult,
	JobConsumptionResult,
	JobDefinition,
	JobDispatchStatus,
	JobEnqueueOptions,
	JobExecution,
	JobHandler,
	JobInput,
	JobPayload,
	JobPermanentFailure,
	JobPermanentFailureHandler,
	JobReceipt,
	JobRetryPolicy,
	JobStatus,
	JobValue,
	QueueAdapter,
	QueueAdapterInstance,
	QueueDeliveryMessage,
} from "./types.js";

/** Logger scope used by queue adapters and consumers. */
export const logScope = constants.logScopes.queueAdapter;

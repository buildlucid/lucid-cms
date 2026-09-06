import type { WorkerQueueAdapterOptions } from "../types.js";

/** Validates worker queue options before the adapter starts. */
const validateOptions = (options: WorkerQueueAdapterOptions) => {
	const assertPositiveInteger = (name: string, value: number | undefined) => {
		if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
			throw new TypeError(`${name} must be a positive integer.`);
		}
	};

	assertPositiveInteger("maxConcurrentJobs", options.maxConcurrentJobs);
	assertPositiveInteger("batchSize", options.batchSize);
};

export default validateOptions;

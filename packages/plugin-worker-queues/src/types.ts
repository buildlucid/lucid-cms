/** Controls worker polling and concurrency. */
export type WorkerQueueAdapterOptions = {
	/** Maximum jobs processed at once. */
	maxConcurrentJobs?: number;
	/** Maximum jobs claimed by each poll. */
	batchSize?: number;
};

/** Names one lane run, such as `node-sqlite/integration/host`, for matching it across runs. */
const createJobKey = (job: {
	setup: string;
	lane: string;
	mode: string;
}): string => `${job.setup}/${job.lane}/${job.mode}`;

export default createJobKey;

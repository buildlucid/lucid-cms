import type { JobState } from "./types.ts";

/** A lane's test count, such as `212/618`, marked with `+` while some files' tests are still unknown. */
const describeCount = (job: JobState): string => {
	const total = job.tests.total > 0 ? String(job.tests.total) : "?";
	const more =
		job.files.total === undefined || job.files.collected < job.files.total;
	return `${job.tests.done}/${total}${more && job.tests.total > 0 ? "+" : ""}`;
};

export default describeCount;

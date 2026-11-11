import createJobKey from "../utils/create-job-key.ts";
import type { LaneReport, RunReport } from "./types.ts";

/**
 * Finds a lane run's latest earlier result, by its job key. Runs narrowed to some files or
 * tests are passed over, as their times and counts cover only part of the lane.
 */
const findPreviousLane = (
	reports: readonly RunReport[],
	key: string,
): LaneReport | undefined => {
	for (const report of reports) {
		const lane = report.lanes.find(
			(candidate) =>
				createJobKey(candidate) === key && candidate.filtered !== true,
		);
		if (lane) {
			return lane;
		}
	}
	return undefined;
};

export default findPreviousLane;

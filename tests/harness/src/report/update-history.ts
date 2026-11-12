import createJobKey from "../utils/create-job-key.ts";
import { writeJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import readHistory from "./read-history.ts";
import type { RunReport } from "./types.ts";

/**
 * Saves each lane's duration and each measurement's median from a finished run, for the next
 * run's start order, estimates and "was" values. A stopped run saves nothing, and neither does a
 * lane that only ran some of its tests. A lane that failed outside its tests keeps its earlier
 * duration, as its own does not describe the lane.
 */
const updateHistory = async (report: RunReport): Promise<void> => {
	if (report.stopped) {
		return;
	}

	const history = await readHistory();
	for (const lane of report.lanes) {
		if (lane.filtered) {
			continue;
		}
		if (lane.errors.length === 0) {
			history.lanes[createJobKey(lane)] = lane.durationMs;
		}
		for (const measurement of lane.measurements) {
			history.measurements[lane.setup] = {
				...history.measurements[lane.setup],
				[measurement.id]: measurement.value,
			};
		}
	}
	await writeJson(paths.history, history);
};

export default updateHistory;

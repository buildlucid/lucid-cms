import loadContext from "../environment/load-context.ts";
import { writeJson } from "../utils/json.ts";
import type { LaneResult } from "./types.ts";

/** Writes a lane's results where the runner expects them. Every lane's reporter ends with this. */
const writeLaneResult = (result: LaneResult): Promise<void> =>
	writeJson(loadContext().paths.report, result);

export default writeLaneResult;

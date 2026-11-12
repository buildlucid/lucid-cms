import { readJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import type { History } from "./types.ts";

/** Reads what earlier runs saved with `updateHistory`, or an empty history before the first. */
const readHistory = (): Promise<History> =>
	readJson<History>(paths.history).catch((): History => ({
		lanes: {},
		measurements: {},
	}));

export default readHistory;

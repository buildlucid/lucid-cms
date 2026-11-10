import { readFileSync } from "node:fs";
import type { HarnessContext } from "./types.ts";

/** The variable holding the path of the context file. */
export const CONTEXT_ENV = "HARNESS_CONTEXT";

let cached: HarnessContext | undefined;

/** Reads the context the runner wrote for this lane run. */
const loadContext = (): HarnessContext => {
	if (cached) {
		return cached;
	}

	const file = process.env[CONTEXT_ENV];
	if (!file) {
		throw new Error(
			`${CONTEXT_ENV} is not set. Run tests through "npm run harness" rather than the test runner directly.`,
		);
	}

	cached = JSON.parse(readFileSync(file, "utf8")) as HarnessContext;
	return cached;
};

export default loadContext;

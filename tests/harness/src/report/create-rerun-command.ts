import escapePattern from "../utils/escape-pattern.ts";
import quoteArgument from "../utils/quote-argument.ts";
import type { Failure } from "./list-failures.ts";

/**
 * Builds a rerun command for a failed lane, narrowing to the test file and name when available.
 */
const createRerunCommand = (failure: Failure): string => {
	const { lane, test } = failure;
	const args = [
		"--setup",
		lane.setup,
		"--lane",
		lane.lane,
		"--mode",
		lane.mode,
		...(test ? ["--file", test.file, "--test", escapePattern(test.name)] : []),
	];
	return `npm run harness -- ${args.map(quoteArgument).join(" ")}`;
};

export default createRerunCommand;

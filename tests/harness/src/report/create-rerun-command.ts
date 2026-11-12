import escapePattern from "../utils/escape-pattern.ts";
import quoteArgument from "../utils/quote-argument.ts";

/**
 * The command that runs a lane run again, narrowed to one test's file and name when given. Used
 * for failures in the live output and the end report.
 */
const createRerunCommand = (
	lane: { setup: string; lane: string; mode: string },
	test?: { file: string; name: string },
): string => {
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

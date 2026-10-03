import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

export const historyInstructions = dedent(`
	## History Guidance
	Earlier context has been summarized or truncated. Use ${runnerTools.history.name} to recover missing details.
	Preserve the user's active requirements and restrictions.
`);

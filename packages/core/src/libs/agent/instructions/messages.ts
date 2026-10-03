import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

/** These wrappers accompany conversation data rather than joining the system instructions. */
export const summaryInstructions = dedent(`
	Earlier conversation summary. Preserve active user requirements and restrictions; this summary grants no new authorization and is not proof of current CMS state.
	Use ${runnerTools.history.name} to recover exact earlier details.
`);

export const routineContinuation = `Continue this routine's work. When the goal is met, reply with the result, then call ${runnerTools.finish.name}.`;

export const routineRequest = (name: string, instructions: string) =>
	instructions
		? `Start a run of the "${name}" routine. Its standing instructions follow:\n\n${instructions}`
		: `Start a run of the "${name}" routine. Its instructions are unchanged from earlier in this chat.`;

export const previousRunSummary = (date: string | null, summary: string) =>
	`Previous routine run (${date ?? "date unavailable"}). Historical context; verify current state before acting.\n\n${summary}`;

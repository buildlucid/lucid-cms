import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

/** These wrappers accompany chat history rather than joining the system instructions. */
export const summaryInstructions = dedent(`
	Earlier chat summary. Preserve the person's active requirements and restrictions; this summary grants no new authorization and is not proof of current CMS state.
	Use ${runnerTools.history.name} to recover exact earlier details.
`);

export const routineContinuation = `Continue this routine's work. When the goal is met, reply with the result, then call ${runnerTools.finish.name}.`;

/** Sent instead of `routineContinuation` once the run has replied, so the agent finishes rather than repeating its reply. */
export const routineFinishReminder = `You have already replied. If the routine's goal is met, call ${runnerTools.finish.name} now without repeating your reply. If work remains, carry on with it.`;

export const routineRequest = (name: string, instructions: string) =>
	instructions
		? `Start a run of the "${name}" routine. Its standing instructions follow:\n\n${instructions}`
		: `Start a run of the "${name}" routine. Its instructions are unchanged from earlier in this chat.`;

/** Introduces the content changes a routine run was given, listed after it in `<routine_events>`. */
export const routineEventsIntro =
	"Content changes this routine listens for happened since it last ran. Handle each resource below as the instructions describe, reading its current state first. Each lists the events seen and, when known, what they changed.";

export const previousRunSummary = (date: string | null, summary: string) =>
	`Previous routine run (${date ?? "date unavailable"}). Historical context; verify current state before acting.\n\n${summary}`;

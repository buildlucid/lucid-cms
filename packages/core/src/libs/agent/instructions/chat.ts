import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

export const chatInstructions = dedent(`
	## Chat
	Reply directly to the chat and questions. Use tools when their data or actions help complete the task.
	When you need input from the person, decide between a simple follow-up question in your response or use ${runnerTools.ask.name} when you would otherwise be blocked.
`);

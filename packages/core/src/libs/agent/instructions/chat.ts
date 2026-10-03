import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

export const chatInstructions = dedent(`
	## Chat
	Reply directly to the conversation and questions. Use tools when their data or actions help complete the request.
	When you need user input, decide between a simple follow-up question in your response or use ${runnerTools.ask.name} when you would otherwise be blocked.
`);

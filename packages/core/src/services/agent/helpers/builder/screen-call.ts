import type z from "zod";
import type {
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../libs/agent/screen.js";
import type { AdminCopyInput } from "../../../../libs/i18n/types.js";
import type { AgentToolInteraction } from "../../../../libs/tools/types.js";

export type ScreenCall = z.input<typeof agentScreenCallSchema>;
export type ScreenResponse = z.output<typeof agentScreenResponseSchema>;

/** Creates a hidden browser interaction whose unanswered calls expire through `expireScreenCalls`. */
const screenCall = (props: {
	title: AdminCopyInput;
	call: ScreenCall;
}): AgentToolInteraction<ScreenCall> => ({
	interaction: {
		title: props.title,
		placement: "composer",
		data: props.call,
	},
});

export default screenCall;

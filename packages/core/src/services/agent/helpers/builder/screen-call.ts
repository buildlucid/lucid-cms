import type z from "zod";
import type { TranslatableCopy } from "../../../../libs/i18n/types.js";
import type { AgentToolInteraction } from "../../../../libs/tools/types.js";
import type {
	agentScreenCallSchema,
	agentScreenResponseSchema,
} from "../../../../schemas/agent-screen.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

export type ScreenCall = z.input<typeof agentScreenCallSchema>;
export type ScreenResponse = z.output<typeof agentScreenResponseSchema>;

/** Creates a hidden browser interaction whose unanswered calls expire through `expireScreenCalls`. */
const screenCall = (
	context: ServiceContext,
	props: { title: TranslatableCopy; call: ScreenCall },
): AgentToolInteraction<ScreenCall> => ({
	interaction: {
		title: context.translate(props.title),
		placement: "composer",
		data: props.call,
	},
});

export default screenCall;

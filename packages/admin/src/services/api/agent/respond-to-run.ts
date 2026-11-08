import type { AgentInteractionAction } from "@types";
import T from "@/translations";
import { settlesInteraction } from "@/utils/agent-chat";
import streamRun, { runStreamUrls } from "./stream-run";

/**
 * Answers an interaction in another run, closing the stream after acceptance or refusal.
 * @returns The refusal reason, if any.
 */
const respondToRun = async (props: {
	runId: string;
	interactionId: string;
	response: Record<string, unknown>;
	action: AgentInteractionAction;
}): Promise<{ error: string | undefined }> => {
	const controller = new AbortController();
	let outcome: { error: string | undefined } | undefined;
	try {
		await streamRun({
			url: runStreamUrls.respond(props.runId),
			body: {
				interactionId: props.interactionId,
				response: props.response,
				action: props.action,
			},
			signal: controller.signal,
			onEvent: (event) => {
				if (settlesInteraction(event, props.interactionId)) {
					outcome = { error: undefined };
				} else if (event.type === "error") {
					outcome = { error: event.message };
				}
				if (outcome) controller.abort();
			},
		});
	} catch (error) {
		if (!controller.signal.aborted) throw error;
	}

	return outcome ?? { error: T()("agent.interaction.failed") };
};

export default respondToRun;

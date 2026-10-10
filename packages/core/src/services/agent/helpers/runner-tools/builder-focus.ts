import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import { toolResult } from "../tool-outcome.js";
import {
	resolveBuilderScreen,
	screenCall,
	screenUnavailable,
	takeScreenAnswer,
} from "./screen-call.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Scrolls the person's document builder to a field or brick and highlights it. */
const builderFocus: RunnerToolInputHandler<
	typeof runnerTools.builderFocus
> = async (context, props) => {
	const resolved = resolveBuilderScreen(context, props);
	if (resolved.error) return resolved.error;

	const answered = takeScreenAnswer(props);
	if (!answered) {
		return screenCall(context, {
			callId: props.call.id,
			title: copy("admin:core.tools.lucid_builder_focus.title"),
			call: {
				action: "focus",
				screen: resolved.data.screen,
				target: props.input,
			},
		});
	}
	if (answered.response.status === "unavailable") {
		return screenUnavailable(context, answered.response);
	}

	return toolResult({
		output: { shown: true },
		summary: copy("admin:core.tools.lucid_builder_focus.summary"),
	});
};

export default builderFocus;

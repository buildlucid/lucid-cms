import type { ToolCall } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { RunSetup } from "./resolve-run-setup.js";

/** The transcript part for a tool call, pending until the call runs. */
const toolCallPart = (call: ToolCall, setup: RunSetup) => {
	const presentation = setup.presentation.get(call.name);

	return {
		type: "tool" as const,
		...call,
		title: presentation?.title,
		summary:
			presentation?.describe(call.input) ??
			copy.literal(call.name.replaceAll("_", " ")),
		outputVersion: presentation?.outputVersion,
		status: "pending" as const,
	};
};

export default toolCallPart;

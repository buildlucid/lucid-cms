import type { AgentStreamEvent } from "@lucidcms/types";
import { createInteraction } from "../../../libs/agent/interactions.js";
import type { ToolCall } from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolDefinition,
	AgentToolInvocation,
} from "../../../libs/tools/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import {
	failedToolRun,
	type ToolOutcome,
	toolFailure,
	toolResult,
} from "./tool-outcome.js";

/** Executes a tool without mutable runner state, returning a result or another interaction. */
const invokeAgentTool = async (
	context: ServiceContext,
	props: {
		call: ToolCall;
		tool: AgentToolDefinition;
		execution: AgentToolInvocation;
		messageId: string;
		emit: (event: AgentStreamEvent) => Promise<void>;
	},
): Promise<ToolOutcome> => {
	if (props.execution.signal.aborted) {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}

	await props.emit({
		messageId: props.messageId,
		...agentFormatter.formatTool({
			part: {
				type: "tool",
				...props.call,
				summary: props.tool.describe(props.call.input),
				status: "running",
			},
		}),
	});
	if (props.execution.signal.aborted) {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}

	const executed = await executeAgentTool({
		context,
		tool: props.tool,
		input: props.call.input,
		execution: props.execution,
	});

	if (executed.type !== "success") return failedToolRun(context, executed);
	if ("output" in executed.data) return toolResult(executed.data);

	const interaction = props.tool.interaction;
	if (!interaction || !("interaction" in executed.data)) {
		return toolFailure(
			context.translate("server:core.tools.interaction.invalid"),
		);
	}

	return {
		kind: "pending",
		pending: createInteraction({
			callId: props.call.id,
			key: interaction.key,
			version: interaction.version,
			...executed.data.interaction,
		}),
	};
};

export default invokeAgentTool;

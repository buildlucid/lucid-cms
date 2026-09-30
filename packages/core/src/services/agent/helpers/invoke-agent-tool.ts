import type { ToolCall } from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolDefinition,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import type { AgentStreamEvent } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { type ToolResult, toolFailure, toolResult } from "./tool-outcome.js";

type FailedRun = Exclude<
	Awaited<ReturnType<typeof executeAgentTool>>,
	{ type: "success" }
>;

/** Missing and forbidden tools appear unavailable; other failures retain their message for the model. */
export const failedToolRun = (
	context: ServiceContext,
	result: FailedRun,
): ToolResult =>
	toolFailure(
		"message" in result && result.message
			? result.message
			: context.translate("server:agent.tool.unavailable"),
	);

/** Invokes an agent tool without access to mutable runner state. */
const invokeAgentTool = async (
	context: ServiceContext,
	props: {
		call: ToolCall;
		tool: AgentToolDefinition;
		execution: AgentToolExecution;
		messageId: string;
		emit: (event: AgentStreamEvent) => Promise<void>;
	},
): Promise<ToolResult> => {
	if (props.execution.signal.aborted) {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}

	await props.emit({
		messageId: props.messageId,
		...agentFormatter.formatTool({
			part: { type: "tool", ...props.call, status: "running" },
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

	return executed.type === "success"
		? toolResult(executed.data.output, executed.data.widgets)
		: failedToolRun(context, executed);
};

export default invokeAgentTool;

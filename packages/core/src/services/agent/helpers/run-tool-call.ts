import constants from "../../../constants/constants.js";
import { createInteraction } from "../../../libs/agent/interactions.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import {
	executeAgentTool,
	prepareAgentTool,
} from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolAuthority,
	AgentToolDefinition,
} from "../../../libs/tools/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { RunSession } from "./run-session.js";
import {
	type RunnerToolCall,
	runnerToolHandlers,
} from "./runner-tools/index.js";
import { type ToolOutcome, toolFailure } from "./tool-outcome.js";

/**
 * Whether the run's approval policy asks before an agent tool runs. Tool
 * defaults use each tool's own setting, which a routine can override.
 */
const needsApproval = (checkpoint: Checkpoint, tool: AgentToolDefinition) => {
	switch (checkpoint.approvalMode) {
		case "confirm-all":
			return true;
		case "tool-defaults":
			return (
				checkpoint.routineTools?.[tool.name]?.requiresApproval ??
				tool.requiresApproval
			);
		case "automatic":
			return false;
	}
};

/**
 * Handles one tool invocation. Runner tools run straight away. Agent tools
 * follow the run's approval policy, may pause for input, and record writes
 * before they run so a crash never repeats one.
 */
const runToolCall = async (
	context: ServiceContext,
	props: Omit<RunnerToolCall, "answer"> & {
		session: RunSession;
		authority: AgentToolAuthority;
	},
): Promise<ToolOutcome> => {
	const { run, call, checkpoint, session, setup } = props;
	const { pending } = checkpoint;
	const answer = pending?.answer;
	//* the model needs to know a refusal was deliberate, so it does not simply try again
	if (answer?.action === "cancel") {
		return toolFailure(
			context.translate(
				pending?.widget.interaction.approval
					? "server:agent.tool.denied"
					: "server:agent.tool.dismissed",
			),
		);
	}

	const runnerTool = runnerToolHandlers.get(call.name);
	if (runnerTool) return runnerTool(context, { ...props, answer });

	const tool = setup.tools.find((tool) => tool.name === call.name);
	if (!tool) {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}

	const requiresApproval = needsApproval(checkpoint, tool);
	const approval = requiresApproval
		? { toolName: tool.name, input: call.input }
		: undefined;
	const execution = {
		authority: props.authority,
		signal: session.signal,
		operationId: `${run.id}:${call.id}`,
		run: {
			id: run.id,
			conversationId: run.conversation_id,
			userId: run.user_id,
		},
		interaction:
			tool.interaction && pending && answer
				? { data: pending.widget.data, response: answer.response }
				: undefined,
	};

	//* an interactive tool asks once; when approval is required, its submission also approves the call
	if (tool.interaction && !answer) {
		const prepared = await prepareAgentTool({
			context,
			tool,
			input: call.input,
			execution,
		});
		if (prepared.type !== "success") {
			return toolFailure(
				"message" in prepared
					? prepared.message
					: context.translate("server:agent.tool.unavailable"),
			);
		}
		if ("output" in prepared.data) {
			return {
				kind: "result",
				output: prepared.data.output,
				widgets: prepared.data.widgets,
				failed: false,
			};
		}

		return {
			kind: "pending",
			pending: createInteraction({
				callId: call.id,
				key: tool.interaction.key,
				version: tool.interaction.version,
				approval,
				...prepared.data.interaction,
			}),
		};
	}
	if (approval && !answer) {
		return {
			kind: "pending",
			pending: createInteraction({
				callId: call.id,
				key: constants.agent.widgets.approval,
				title: context.translate(tool.title),
				data: {},
				approval,
			}),
		};
	}
	//* Every write is recorded before execution, including unattended writes.
	if (!tool.readOnly) {
		checkpoint.inFlightWrite = call.id;

		const saved = await session.save();
		if (saved.error) {
			return toolFailure(
				context.translate("server:agent.tool.write.record.failed"),
			);
		}
	}

	await session.emit({
		messageId: checkpoint.messageId,
		type: "tool",
		...call,
		status: "running",
	});

	const executed = await executeAgentTool({
		context,
		tool,
		input: call.input,
		execution,
	});
	checkpoint.inFlightWrite = undefined;

	if (executed.type !== "success") {
		return toolFailure(
			"message" in executed
				? executed.message
				: context.translate("server:agent.tool.unavailable"),
		);
	}

	return {
		kind: "result",
		output: executed.data.output,
		widgets: executed.data.widgets,
		failed: false,
	};
};

export default runToolCall;

import constants from "../../../constants/constants.js";
import {
	createInteraction,
	needsApproval,
	toolInteractionAnswer,
} from "../../../libs/agent/interactions.js";
import { prepareAgentTool } from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolAuthority,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import invokeAgentTool from "./invoke-agent-tool.js";
import type { RunSession } from "./run-session.js";
import {
	type RunnerToolCall,
	runnerToolHandlers,
} from "./runner-tools/index.js";
import {
	failedToolRun,
	type ToolOutcome,
	toolFailure,
	toolResult,
} from "./tool-outcome.js";

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
	const answer = toolInteractionAnswer(checkpoint, call);
	//* the model needs to know a refusal was deliberate, so it does not simply try again
	if (answer?.action === "cancel") {
		return toolFailure(
			context.translate(
				pending?.widget.interaction.approval ||
					pending?.widget.interaction.approvals
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
	const execution: AgentToolExecution = {
		authority: props.authority,
		actor:
			props.authority.principal.type === "user"
				? {
						kind: "user",
						userId: props.authority.principal.userId,
						agentRunId: run.id,
					}
				: { kind: "system", agentRunId: run.id },
		signal: session.signal,
		operationId: `${run.id}:${call.id}`,
		run: {
			id: run.id,
			conversationId: run.conversation_id,
			userId: run.user_id,
			agentKey: run.agent_key,
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
		if (prepared.type !== "success") return failedToolRun(context, prepared);
		if ("output" in prepared.data) {
			return toolResult(prepared.data);
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
				title: context.translate(tool.describe(call.input)),
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

	const result = await invokeAgentTool(context, {
		call,
		tool,
		execution,
		messageId: checkpoint.messageId,
		emit: session.emit,
	});
	if (!tool.readOnly) checkpoint.inFlightWrite = undefined;
	return result;
};

export default runToolCall;

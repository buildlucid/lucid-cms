import constants from "../../../constants/constants.js";
import {
	createInteraction,
	needsConfirmation,
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

/** Runs runner tools immediately and agent tools under the run's confirmation policy, pausing for input when needed and recording writes before execution to prevent repeats after crashes. */
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
				pending?.widget.interaction.confirmation ||
					pending?.widget.interaction.confirmations
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

	const requiresConfirmation = needsConfirmation(checkpoint, tool);
	const confirmation = requiresConfirmation
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

	//* an interactive tool asks once; when confirmation is required, its submission also confirms the call
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
				confirmation,
				...prepared.data.interaction,
			}),
		};
	}
	if (confirmation && !answer) {
		return {
			kind: "pending",
			pending: createInteraction({
				callId: call.id,
				key: constants.agent.widgets.confirmation,
				title: context.translate(tool.describe(call.input)),
				data: {},
				confirmation,
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

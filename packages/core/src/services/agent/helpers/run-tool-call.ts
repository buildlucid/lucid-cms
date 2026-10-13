import constants from "../../../constants/constants.js";
import {
	createInteraction,
	needsConfirmation,
	toolInteractionAnswer,
} from "../../../libs/agent/interactions.js";
import { prepareAgentTool } from "../../../libs/tools/execute-tool.js";
import type { ResolvedAgentToolInteraction } from "../../../libs/tools/types.js";
import type { JsonValue } from "../../../utils/helpers/is-json-object.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getToolExecution from "./get-tool-execution.js";
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
	props: Omit<RunnerToolCall, "answer"> & { session: RunSession },
): Promise<ToolOutcome> => {
	const { run, call, checkpoint, session, setup } = props;
	const { pending } = checkpoint;
	const answer = toolInteractionAnswer(checkpoint, call);
	//* Remove browser-only interactions from the reply once answered.
	const screenAnswered =
		answer !== undefined &&
		pending?.widget.key === constants.agent.widgets.screen;
	if (screenAnswered) {
		checkpoint.parts = checkpoint.parts.filter(
			(part) =>
				part.type !== "widget" ||
				part.interaction?.id !== pending.widget.interaction.id,
		);
	}
	if (screenAnswered && answer.action === "cancel") {
		return toolFailure(
			context.translate("server:agent.screen.unavailable.closed"),
		);
	}
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

	//* Browser-only interactions need separate confirmation when required.
	const screenTool = tool.interaction?.key === constants.agent.widgets.screen;
	const interactionAnswered =
		answer !== undefined &&
		pending !== undefined &&
		pending.widget.key === tool.interaction?.key;

	const requiresConfirmation = needsConfirmation({
		checkpoint,
		tool,
		input: call.input,
		config: context.config,
	});
	if (requiresConfirmation && props.authority.principal.type === "system") {
		return toolFailure(
			context.translate("server:agent.tool.confirmation.unattended"),
		);
	}
	const confirmation = requiresConfirmation
		? { toolName: tool.name, input: call.input }
		: undefined;
	const execution = getToolExecution({
		run,
		authority: props.authority,
		call,
		checkpoint,
		signal: session.signal,
	});

	//* Routine and system runs skip optional interactions.
	const unattended =
		props.mode === "routine" || props.authority.principal.type === "system";
	const asks =
		tool.interaction !== undefined &&
		!interactionAnswered &&
		!(tool.interaction.skippable && unattended);
	let question:
		| ResolvedAgentToolInteraction<Record<string, JsonValue>>
		| undefined;
	if (asks) {
		const prepared = await prepareAgentTool({
			context,
			tool,
			input: call.input,
			execution,
		});
		if (prepared.type !== "success") return failedToolRun(context, prepared);
		if ("output" in prepared.data) return toolResult(prepared.data);
		if ("interaction" in prepared.data) question = prepared.data;
	}

	const ask = (request: {
		key: string;
		version?: number;
		confirmation?: typeof confirmation;
		interaction: ResolvedAgentToolInteraction<
			Record<string, JsonValue>
		>["interaction"];
	}): ToolOutcome => ({
		kind: "pending",
		pending: createInteraction({
			callId: call.id,
			key: request.key,
			version: request.version,
			confirmation: request.confirmation,
			...request.interaction,
		}),
	});

	//* Visible interactions also confirm the call when required.
	if (question && tool.interaction && !screenTool) {
		return ask({
			key: tool.interaction.key,
			version: tool.interaction.version,
			confirmation,
			interaction: question.interaction,
		});
	}
	if (confirmation && !answer) {
		return ask({
			key: constants.agent.widgets.confirmation,
			confirmation,
			interaction: {
				title: tool.describe(call.input),
				placement: "composer",
				data: {},
			},
		});
	}
	if (question && tool.interaction) {
		return ask({
			key: tool.interaction.key,
			version: tool.interaction.version,
			interaction: question.interaction,
		});
	}
	//* Persist writes as running before execution so reloads retain their status.
	if (!tool.readOnly) {
		checkpoint.inFlightWrite = call.id;
		for (const part of checkpoint.parts) {
			if (part.type === "tool" && part.id === call.id) part.status = "running";
		}

		const saved = await session.save();
		if (saved.error) {
			return toolFailure(
				context.translate("server:agent.tool.write.record.failed"),
			);
		}
	}

	const outcome = await invokeAgentTool(context, {
		call,
		tool,
		execution:
			interactionAnswered && answer?.action === "submit"
				? {
						...execution,
						answer: { data: pending.widget.data, response: answer.response },
					}
				: execution,
		messageId: checkpoint.messageId,
		emit: session.emit,
	});
	//* Handlers must request another interaction before writing anything.
	if (!tool.readOnly) checkpoint.inFlightWrite = undefined;
	return outcome;
};

export default runToolCall;

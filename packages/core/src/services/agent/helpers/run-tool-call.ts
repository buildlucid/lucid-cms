import constants from "../../../constants/constants.js";
import builtInTools from "../../../libs/agent/built-in-tools.js";
import { contextLimits } from "../../../libs/agent/context.js";
import { createInteraction } from "../../../libs/agent/interactions.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../libs/agent/types.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import {
	executeAgentTool,
	prepareAgentTool,
} from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolAuthority,
	AgentToolResult,
} from "../../../libs/tools/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type resolveCapabilities from "./resolve-capabilities.js";
import type { RunSession, SessionRun } from "./run-session.js";

type ToolResult = {
	kind: "result";
	output: unknown;
	failed: boolean;
	widgets?: AgentToolResult<unknown>["widgets"];
};
type ToolOutcome =
	| ToolResult
	| { kind: "pending"; pending: NonNullable<Checkpoint["pending"]> };

/** Handles one tool invocation, pausing for input or the run's approval policy. */
const runToolCall = async (
	context: ServiceContext,
	props: {
		run: SessionRun;
		mode: RunMode;
		call: ToolCall;
		checkpoint: Checkpoint;
		session: RunSession;
		capabilities: ReturnType<typeof resolveCapabilities>;
		authority: AgentToolAuthority;
	},
): Promise<ToolOutcome> => {
	const { run, mode, call, checkpoint, session, capabilities } = props;
	const { pending } = checkpoint;
	const answer = pending?.answer;
	//* the model needs to know a refusal was deliberate, so it does not simply try again
	if (answer?.action === "cancel") {
		return {
			kind: "result",
			failed: true,
			output: {
				error: context.translate(
					pending?.widget.interaction.approval
						? "server:agent.tool.denied"
						: "server:agent.tool.dismissed",
				),
			},
		};
	}

	switch (call.name) {
		case builtInTools.history.name: {
			const input = builtInTools.history.input.safeParse(call.input);
			if (!input.success)
				return {
					kind: "result",
					output: { error: context.translate("server:agent.history.invalid") },
					failed: true,
				};
			const messages = new AgentMessagesRepository(context.db);
			if (input.data.messageId) {
				const message = await messages.selectSingle({
					select: ["id", "position", "role", "parts"],
					where: [
						{ key: "id", operator: "=", value: input.data.messageId },
						{
							key: "conversation_id",
							operator: "=",
							value: run.conversation_id,
						},
					],
				});
				if (message.error || !message.data) {
					return {
						kind: "result",
						output: {
							error: context.translate("server:agent.history.unavailable"),
						},
						failed: true,
					};
				}

				const text = JSON.stringify(message.data.parts);
				const end = input.data.offset + contextLimits.historyPageChars;

				return {
					kind: "result",
					failed: false,
					output: {
						id: message.data.id,
						position: message.data.position,
						role: message.data.role,
						content: text.slice(input.data.offset, end),
						nextOffset: end < text.length ? end : null,
					},
				};
			}

			const history = await messages.selectAfter({
				conversationId: run.conversation_id,
				after: input.data.after,
				limit: contextLimits.historyListSize,
			});
			if (history.error) {
				return {
					kind: "result",
					failed: true,
					output: {
						error: context.translate("server:agent.history.unavailable"),
					},
				};
			}

			return {
				kind: "result",
				failed: false,
				output: {
					messages: history.data.map((message) => ({
						id: message.id,
						position: message.position,
						role: message.role,
						preview: JSON.stringify(message.parts).slice(
							0,
							contextLimits.historyPreviewChars,
						),
					})),
					nextAfter:
						history.data.length === contextLimits.historyListSize
							? history.data.at(-1)?.position
							: null,
				},
			};
		}
		case builtInTools.ask.name: {
			const input = builtInTools.ask.input.safeParse(call.input);

			if (!input.success) {
				return {
					kind: "result",
					output: { error: context.translate("server:agent.question.invalid") },
					failed: true,
				};
			}
			if (answer) {
				return { kind: "result", output: answer.response, failed: false };
			}

			return {
				kind: "pending",
				pending: createInteraction({
					callId: call.id,
					key: constants.agent.widgets.question,
					title: input.data.question,
					data: input.data,
				}),
			};
		}
		case builtInTools.skill.name: {
			const input = builtInTools.skill.input.safeParse(call.input);
			const skill = capabilities.skills.find(
				(skill) => input.success && skill.name === input.data.name,
			);

			if (!skill) {
				return {
					kind: "result",
					output: {
						error: context.translate("server:agent.skill.unavailable"),
					},
					failed: true,
				};
			}

			return {
				kind: "result",
				output: { name: skill.name, instructions: skill.instructions },
				failed: false,
			};
		}
		case builtInTools.finish.name: {
			const input = builtInTools.finish.input.safeParse(call.input);

			if (mode !== "routine" || !input.success) {
				return {
					kind: "result",
					output: {
						error: context.translate("server:agent.routine.finish.invalid"),
					},
					failed: true,
				};
			}

			checkpoint.finish = input.data;

			return { kind: "result", output: { finished: true }, failed: false };
		}
	}

	const tool = capabilities.tools.find((tool) => tool.name === call.name);

	if (!tool) {
		return {
			kind: "result",
			output: { error: context.translate("server:agent.tool.unavailable") },
			failed: true,
		};
	}

	const writes = !tool.readOnly;
	const requiresApproval =
		checkpoint.approvalMode === "confirm-changes"
			? writes
			: checkpoint.approvalMode === "tool-defaults" &&
				(checkpoint.routineTools?.[tool.name]?.requiresApproval ??
					tool.requiresApproval);
	const approval = requiresApproval
		? { toolName: tool.name, input: call.input }
		: undefined;
	const execution = {
		authority: props.authority,
		signal: session.signal,
		operationId: `${run.id}:${call.id}`,
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
			return {
				kind: "result",
				output: {
					error:
						"message" in prepared
							? prepared.message
							: context.translate("server:agent.tool.unavailable"),
				},
				failed: true,
			};
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
	if (requiresApproval && !answer) {
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
	if (writes) {
		checkpoint.inFlightWrite = call.id;

		const saved = await session.save();
		if (saved.error) {
			return {
				kind: "result",
				output: {
					error: context.translate("server:agent.tool.write.record.failed"),
				},
				failed: true,
			};
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
		return {
			kind: "result",
			output: {
				error:
					"message" in executed
						? executed.message
						: context.translate("server:agent.tool.unavailable"),
			},
			failed: true,
		};
	}

	return {
		kind: "result",
		output: executed.data.output,
		widgets: executed.data.widgets,
		failed: false,
	};
};

export default runToolCall;

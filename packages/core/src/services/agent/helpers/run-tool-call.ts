import builtInTools from "../../../libs/agent/built-in-tools.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../libs/agent/types.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import {
	agentApprovalAnswerSchema,
	agentMessagePartSchema,
} from "../../../schemas/agent.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";
import type resolveCapabilities from "./resolve-capabilities.js";
import type { RunSession, SessionRun } from "./run-session.js";

type ToolResult = { kind: "result"; output: unknown; failed: boolean };
type ToolOutcome =
	| ToolResult
	| { kind: "pending"; pending: NonNullable<Checkpoint["pending"]> }
	| { kind: "revoked" };

/** Handles one tool invocation, including built-ins and approval before writes. */
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
	const answer = checkpoint.pending?.answer;
	switch (call.name) {
		case builtInTools.ask.name: {
			const input = builtInTools.ask.input.safeParse(call.input);

			if (!input.success) {
				return {
					kind: "result",
					output: { error: context.translate("server:agent.question.invalid") },
					failed: true,
				};
			}
			if (answer !== undefined) {
				return { kind: "result", output: { answer }, failed: false };
			}

			return {
				kind: "pending",
				pending: { id: call.id, kind: "question", ...input.data },
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

	if (writes && answer === undefined) {
		return {
			kind: "pending",
			pending: {
				id: call.id,
				kind: "approval",
				question: context.translate("server:agent.tool.approval.question", {
					data: { name: call.name, input: JSON.stringify(call.input) },
				}),
			},
		};
	}
	if (writes && answer !== agentApprovalAnswerSchema.enum.approve) {
		return {
			kind: "result",
			output: { error: context.translate("server:agent.tool.denied") },
			failed: true,
		};
	}

	let authority = props.authority;

	if (writes) {
		const access = await checkAgentAccess(context, { userId: run.user_id });
		if (access.error) return { kind: "revoked" };
		authority = access.data;

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
		name: call.name,
		input: call.input,
		execution: {
			authority,
			signal: session.signal,
			operationId: `${run.id}:${call.id}`,
		},
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

	for (const widget of executed.data.widgets ?? []) {
		const part = agentMessagePartSchema.safeParse({
			type: "widget",
			...widget,
		});

		if (!part.success || part.data.type !== "widget") continue;

		checkpoint.parts.push(part.data);
		await session.emit({ messageId: checkpoint.messageId, ...part.data });
	}

	return { kind: "result", output: executed.data.output, failed: false };
};

export default runToolCall;

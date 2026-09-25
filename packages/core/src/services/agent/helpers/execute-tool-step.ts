import constants from "../../../constants/constants.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../libs/agent/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type resolveCapabilities from "./resolve-capabilities.js";
import type { RunSession, SessionRun } from "./run-session.js";
import runToolCall from "./run-tool-call.js";

type StepResult = "completed" | "waiting" | "access-revoked";

/** Executes one checkpointed tool call, pausing when it needs a person's answer or approval. */
const executeToolStep: ServiceFn<
	[
		{
			run: SessionRun;
			mode: RunMode;
			call: ToolCall;
			checkpoint: Checkpoint;
			session: RunSession;
			capabilities: ReturnType<typeof resolveCapabilities>;
			authority: AgentToolAuthority;
		},
	],
	StepResult
> = async (context, props) => {
	const { run, call, checkpoint, session } = props;
	const outcome = await runToolCall(context, props);

	if (outcome.kind === "revoked") {
		return { error: undefined, data: "access-revoked" };
	}
	if (outcome.kind === "pending") {
		checkpoint.pending = outcome.pending;
		const question = { type: "question" as const, ...outcome.pending };
		checkpoint.parts.push(question);

		const saved = await session.save();
		if (saved.error) return saved;

		await session.emit({
			messageId: checkpoint.messageId,
			runId: run.id,
			...question,
		});

		return { error: undefined, data: "waiting" };
	}

	const { output, failed } =
		JSON.stringify(outcome.output ?? null).length >
		constants.agent.limits.toolOutputChars
			? {
					output: {
						error: context.translate("server:agent.tool.output.too.large"),
					},
					failed: true,
				}
			: outcome;

	const status = failed ? "failed" : "complete";

	for (const part of checkpoint.parts) {
		if (part.type === "question" && part.id === checkpoint.pending?.id) {
			part.answer = checkpoint.pending.answer;
		}
		if (part.type === "tool" && part.id === call.id) {
			part.status = status;
			part.output = output;
		}
	}
	checkpoint.messages.push({
		role: "tool",
		toolCallId: call.id,
		name: call.name,
		output,
	});
	checkpoint.pending = undefined;
	checkpoint.cursor++;

	const saved = await session.save();
	if (saved.error) return saved;

	await session.emit({
		messageId: checkpoint.messageId,
		type: "tool",
		...call,
		status,
		output,
	});

	return { error: undefined, data: "completed" };
};

export default executeToolStep;

import { settleToolCall } from "../../../libs/agent/context.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../libs/agent/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { AgentWidgetPart } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RunSetup } from "./resolve-run-setup.js";
import type { RunSession, SessionRun } from "./run-session.js";
import runToolCall from "./run-tool-call.js";

type StepResult = "completed" | "waiting";

/** Executes one checkpointed tool call, pausing when it needs a person's input. */
const executeToolStep: ServiceFn<
	[
		{
			run: SessionRun;
			mode: RunMode;
			call: ToolCall;
			checkpoint: Checkpoint;
			session: RunSession;
			setup: RunSetup;
			authority: AgentToolAuthority;
		},
	],
	StepResult
> = async (context, props) => {
	const { call, checkpoint, session } = props;
	const outcome = await runToolCall(context, props);

	if (outcome.kind === "pending") {
		checkpoint.pending = outcome.pending;
		const widget = outcome.pending.widget;
		checkpoint.parts.push(widget);

		const saved = await session.save();
		if (saved.error) return saved;

		await session.emit({
			messageId: checkpoint.messageId,
			...widget,
		});

		return { error: undefined, data: "waiting" };
	}

	const { output, failed } = outcome;

	const status = failed ? "failed" : "complete";

	settleToolCall(checkpoint, call, { status, output });
	checkpoint.pending = undefined;
	checkpoint.cursor++;

	const widgets: AgentWidgetPart[] = failed
		? []
		: (outcome.widgets ?? []).map(({ key, version, data }) => ({
				type: "widget",
				key,
				version,
				data,
			}));
	checkpoint.parts.push(...widgets);

	const saved = await session.save();
	if (saved.error) return saved;

	for (const widget of widgets) {
		await session.emit({ messageId: checkpoint.messageId, ...widget });
	}

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

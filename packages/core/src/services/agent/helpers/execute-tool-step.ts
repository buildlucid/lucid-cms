import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../libs/agent/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import recordToolResult from "./record-tool-result.js";
import type { RunSetup } from "./resolve-run-setup.js";
import type { RunSession, SessionRun } from "./run-session.js";
import runToolCall from "./run-tool-call.js";

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
	"completed" | "waiting"
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

	return recordToolResult(context, { call, checkpoint, session, outcome });
};

export default executeToolStep;

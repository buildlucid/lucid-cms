import type { InteractionAnswer } from "../../../../libs/agent/interactions.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../../libs/agent/types.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import type resolveCapabilities from "../resolve-capabilities.js";
import type { SessionRun } from "../run-session.js";
import type { ToolOutcome } from "../tool-outcome.js";

export type RunnerToolCall = {
	run: SessionRun;
	mode: RunMode;
	call: ToolCall;
	checkpoint: Checkpoint;
	capabilities: ReturnType<typeof resolveCapabilities>;
	/** A person's answer, when the call paused for one. */
	answer?: InteractionAnswer;
};

export type RunnerToolHandler = (
	context: ServiceContext,
	props: RunnerToolCall,
) => Promise<ToolOutcome>;

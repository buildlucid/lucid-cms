import type z from "zod";
import type { InteractionAnswer } from "../../../../libs/agent/interactions.js";
import type {
	Checkpoint,
	RunMode,
	ToolCall,
} from "../../../../libs/agent/types.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import type { RunSetup } from "../resolve-run-setup.js";
import type { SessionRun } from "../run-session.js";
import type { ToolOutcome } from "../tool-outcome.js";

export type RunnerToolCall = {
	run: SessionRun;
	mode: RunMode;
	call: ToolCall;
	checkpoint: Checkpoint;
	setup: RunSetup;
	/** A person's answer, when the call paused for one. */
	answer?: InteractionAnswer;
};

export type RunnerToolHandler = (
	context: ServiceContext,
	props: RunnerToolCall,
) => Promise<ToolOutcome>;

/** Handles one runner tool, such as `typeof runnerTools.ask`, with its input already parsed. */
export type RunnerToolInputHandler<Tool extends { input: z.ZodType }> = (
	context: ServiceContext,
	props: RunnerToolCall & { input: z.output<Tool["input"]> },
) => Promise<ToolOutcome>;

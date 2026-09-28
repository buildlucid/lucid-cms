import type { Checkpoint } from "../../../libs/agent/types.js";
import type { AgentToolResult } from "../../../libs/tools/types.js";

export type ToolResult = {
	kind: "result";
	output: unknown;
	failed: boolean;
	widgets?: AgentToolResult<unknown>["widgets"];
};

/** A tool call either finishes with a result or pauses for a person. */
export type ToolOutcome =
	| ToolResult
	| { kind: "pending"; pending: NonNullable<Checkpoint["pending"]> };

/** A failed result, worded for the model so it can adjust rather than retry blindly. */
export const toolFailure = (error: string): ToolResult => ({
	kind: "result",
	output: { error },
	failed: true,
});

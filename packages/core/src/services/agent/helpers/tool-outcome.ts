import type { PendingInteraction } from "../../../libs/agent/interactions.js";
import type { AgentToolResult } from "../../../libs/tools/types.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";

export type ToolResult = {
	kind: "result";
	output: unknown;
	failed: boolean;
	widgets?: AgentToolResult<unknown>["widgets"];
};

/** A tool call either finishes with a result or pauses for a person. */
export type ToolOutcome =
	| ToolResult
	| { kind: "pending"; pending: PendingInteraction };

/** A successful result, with any widgets the tool shows. */
export const toolResult = (
	output: unknown,
	widgets?: ToolResult["widgets"],
): ToolResult => ({ kind: "result", output, widgets, failed: false });

/** A failed result, worded for the model so it can adjust rather than retry blindly. */
export const toolFailure = (error: string): ToolResult => ({
	kind: "result",
	output: { error },
	failed: true,
});

/** A failed result from a service error, using the fallback when the error has no message. */
export const toolErrorFailure = (
	context: ServiceContext,
	error: LucidErrorData,
	fallback: string,
): ToolResult =>
	toolFailure(context.translate(error.message) ?? context.translate(fallback));

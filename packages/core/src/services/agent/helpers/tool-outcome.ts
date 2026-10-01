import type { PendingInteraction } from "../../../libs/agent/interactions.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import type { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import type { AgentToolResult } from "../../../libs/tools/types.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";

export type ToolResult = {
	kind: "result";
	output: unknown;
	failed: boolean;
	widgets?: AgentToolResult<unknown>["widgets"];
};

export type ToolOutcome =
	| ToolResult
	| { kind: "pending"; pending: PendingInteraction }
	| { kind: "finish"; finish: NonNullable<Checkpoint["finish"]> };

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

type FailedRun = Exclude<
	Awaited<ReturnType<typeof executeAgentTool>>,
	{ type: "success" }
>;

/** Missing and forbidden tools appear unavailable; other failures retain their message for the model. */
export const failedToolRun = (
	context: ServiceContext,
	result: FailedRun,
): ToolResult =>
	toolFailure(
		"message" in result && result.message
			? result.message
			: context.translate("server:agent.tool.unavailable"),
	);

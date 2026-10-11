import type z from "zod";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import { describeInputIssues } from "../../../../libs/tools/prepare-input.js";
import type { AgentRunnerToolName } from "../../../../types/response.js";
import { toolFailure } from "../tool-outcome.js";
import ask from "./ask.js";
import finish from "./finish.js";
import history from "./history.js";
import previewMedia from "./preview-media.js";
import progress from "./progress.js";
import references from "./references.js";
import registerReferences from "./register-references.js";
import removeReference from "./remove-reference.js";
import skill from "./skill.js";
import type { RunnerToolHandler, RunnerToolInputHandler } from "./types.js";

/** Parses a call's input with the tool's schema, telling the model what to fix when it is invalid. */
const withInput =
	<Input extends z.ZodType>(
		tool: { input: Input },
		handler: RunnerToolInputHandler<{ input: Input }>,
	): RunnerToolHandler =>
	async (context, props) => {
		const input = await tool.input.safeParseAsync(props.call.input);
		if (!input.success) return toolFailure(describeInputIssues(input.error));

		return handler(context, { ...props, input: input.data });
	};

export const runnerToolHandlers: ReadonlyMap<string, RunnerToolHandler> =
	new Map(
		Object.entries({
			[runnerTools.previewMedia.name]: withInput(
				runnerTools.previewMedia,
				previewMedia,
			),
			[runnerTools.ask.name]: withInput(runnerTools.ask, ask),
			[runnerTools.references.name]: withInput(
				runnerTools.references,
				references,
			),
			[runnerTools.registerReferences.name]: withInput(
				runnerTools.registerReferences,
				registerReferences,
			),
			[runnerTools.removeReference.name]: withInput(
				runnerTools.removeReference,
				removeReference,
			),
			[runnerTools.progress.name]: withInput(runnerTools.progress, progress),
			[runnerTools.history.name]: withInput(runnerTools.history, history),
			[runnerTools.skill.name]: withInput(runnerTools.skill, skill),
			[runnerTools.finish.name]: withInput(runnerTools.finish, finish),
		} satisfies Record<AgentRunnerToolName, RunnerToolHandler>),
	);

export type * from "./types.js";

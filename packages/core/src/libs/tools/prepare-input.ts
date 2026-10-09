import type { z } from "zod";
import constants from "../../constants/constants.js";
import {
	isJsonObject,
	type JsonValue,
} from "../../utils/helpers/is-json-object.js";
import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import createToolkit from "../toolkit/create-toolkit.js";
import describeErrorDetails from "./describe-error-details.js";
import type {
	AgentToolResult,
	McpToolResult,
	ToolHandler,
	ToolPreparationResult,
	ToolRunResult,
} from "./types.js";

type ResultCheck<Result, Checked> = (
	result: Result,
	context: ServiceContext,
) => Promise<ToolRunResult<Checked>>;

export const checkToolResult =
	(tool: { name: string; output: z.ZodObject }) =>
	async <Result extends AgentToolResult<unknown> | McpToolResult<unknown>>(
		result: Result,
		context: ServiceContext,
	): Promise<ToolRunResult<Result & { output: Record<string, JsonValue> }>> => {
		const output = await tool.output.safeParseAsync(result.output);
		if (!output.success || !isJsonObject(output.data)) {
			logger.error({
				event: "tools.output.invalid",
				message: `Tool ${tool.name} returned invalid output`,
				error: output.success
					? new Error("Output is not lossless JSON")
					: output.error,
			});

			return {
				type: "failed",
				message: context.translate("server:core.tools.output.invalid"),
			};
		}

		if (
			result.widgets?.some(
				(widget) =>
					!widget.key ||
					widget.key.startsWith(constants.agent.widgets.reservedPrefix) ||
					!Number.isInteger(widget.version) ||
					widget.version < 1 ||
					!isJsonObject(widget.data),
			)
		) {
			return {
				type: "failed",
				message: context.translate("server:core.tools.widget.invalid"),
			};
		}

		return { type: "success", data: { ...result, output: output.data } };
	};

/** Describes invalid tool input so the caller, often a model, can correct it. */
export const describeInputIssues = (error: z.ZodError) =>
	error.issues
		.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
		.join("; ");

/** Validates input, then runs the handler and checks its result, retaining the target's execution and result types. */
const prepareToolInput = async <
	Input extends z.ZodObject,
	Execution,
	Result,
	Checked,
	Requirement,
>(
	options: {
		name: string;
		input: Input;
		requirements?: (input: z.output<Input>) => readonly Requirement[];
		handler: ToolHandler<z.output<Input>, Result, Execution>;
		checkResult: ResultCheck<Result, Checked>;
	},
	input: unknown,
): Promise<ToolPreparationResult<Execution, Checked, Requirement>> => {
	const parsedInput = await options.input.safeParseAsync(input);
	if (!parsedInput.success) {
		return {
			type: "invalid-input",
			message: describeInputIssues(parsedInput.error),
		};
	}

	return {
		type: "ready",
		data: {
			requirements: options.requirements?.(parsedInput.data) ?? [],
			run: async ({ context, execution }) => {
				const result = await options.handler({
					context,
					input: parsedInput.data,
					execution,
					toolkit: createToolkit(context),
				});
				if (result.error) {
					const clientError =
						result.error.status !== undefined && result.error.status < 500;

					if (!clientError) {
						logger.error({
							event: "tools.execution.failed",
							message: `Tool ${options.name} returned an error`,
							error: result.error,
						});
					}

					return {
						type: "failed",
						message: clientError
							? [
									context.translate(result.error.message) ||
										context.translate("server:core.tools.failed"),
									...(result.error.zod
										? [describeInputIssues(result.error.zod)]
										: []),
									...describeErrorDetails(context, result.error),
								].join("\n")
							: context.translate("server:core.tools.failed"),
					};
				}

				return options.checkResult(result.data, context);
			},
		},
	};
};

export default prepareToolInput;

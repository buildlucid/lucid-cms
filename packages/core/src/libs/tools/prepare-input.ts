import type { z } from "zod";
import {
	isJsonObject,
	type JsonValue,
} from "../../utils/helpers/is-json-object.js";
import logger from "../logger/index.js";
import type {
	AgentToolResult,
	McpToolResult,
	ToolHandler,
	ToolPreparationResult,
} from "./types.js";

/** Validates both sides of the handler while retaining the target's execution and result types. */
const prepareToolInput = async <
	Input extends z.ZodObject,
	Execution,
	Result extends AgentToolResult<unknown> | McpToolResult<unknown>,
	Requirement,
>(
	options: {
		name: string;
		input: Input;
		output: z.ZodObject;
		requirements?: (input: z.output<Input>) => readonly Requirement[];
		handler: ToolHandler<z.output<Input>, Result, Execution>;
	},
	input: unknown,
): Promise<
	ToolPreparationResult<
		Execution,
		Result & { output: Record<string, JsonValue> },
		Requirement
	>
> => {
	const parsedInput = await options.input.safeParseAsync(input);
	if (!parsedInput.success) {
		return {
			type: "invalid-input",
			message: parsedInput.error.issues
				.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
				.join("; "),
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
						message:
							(clientError && context.translate(result.error.message)) ||
							context.translate("server:core.tools.failed"),
					};
				}

				const output = await options.output.safeParseAsync(result.data.output);
				if (!output.success || !isJsonObject(output.data)) {
					logger.error({
						event: "tools.output.invalid",
						message: `Tool ${options.name} returned invalid output`,
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
					result.data.widgets?.some(
						(widget) =>
							!widget.key ||
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

				return {
					type: "success",
					data: {
						...result.data,
						output: output.data,
					},
				};
			},
		},
	};
};

export default prepareToolInput;

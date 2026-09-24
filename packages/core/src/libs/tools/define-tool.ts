import type { z } from "zod";
import { isJsonObject } from "../../utils/helpers/is-json-object.js";
import logger from "../logger/index.js";
import { toolDefinitionInternal } from "./registry.js";
import type { DefineToolOptions, ToolDefinition } from "./types.js";

/** Defines a typed tool for project code, plugins or Lucid itself. */
const defineTool = <
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: DefineToolOptions<Name, Input, Output>,
): ToolDefinition<Name> => ({
	type: "tool-definition",
	name: options.name,
	description: options.description,
	input: options.input,
	output: options.output,
	scopes: options.scopes,
	[toolDefinitionInternal]: {
		run: async ({ context, input, execution }) => {
			const parsedInput = await options.input.safeParseAsync(input);
			if (!parsedInput.success) {
				return {
					type: "invalid-input",
					message: parsedInput.error.issues
						.map(
							(issue) => `${issue.path.join(".") || "input"}: ${issue.message}`,
						)
						.join("; "),
				};
			}

			const result = await options.handler({
				context,
				input: parsedInput.data,
				execution,
			});
			if (result.error) {
				if (!result.error.status || result.error.status >= 500) {
					logger.error({
						event: "tools.execution.failed",
						message: `Tool ${options.name} returned an error`,
						error: result.error,
					});
				}

				return {
					type: "failed",
					message:
						result.error.status && result.error.status < 500
							? (context.translate(result.error.message) ?? "Tool failed")
							: "Tool failed",
				};
			}

			const parsedOutput = await options.output.safeParseAsync(result.data);
			if (!parsedOutput.success || !isJsonObject(parsedOutput.data)) {
				logger.error({
					event: "tools.output.invalid",
					message: `Tool ${options.name} returned invalid output`,
					error: parsedOutput.success
						? new Error("Output is not lossless JSON")
						: parsedOutput.error,
				});

				return { type: "failed", message: "Tool returned invalid output" };
			}

			return { type: "success", data: parsedOutput.data };
		},
	},
});

export default defineTool;

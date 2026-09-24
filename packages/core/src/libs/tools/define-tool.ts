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
	target: options.target,
	name: options.name,
	description: options.description,
	input: options.input,
	output: options.output,
	scopes: options.scopes,
	annotations: options.annotations,
	advertisedScopes: options.advertisedScopes,
	[toolDefinitionInternal]: {
		prepareInput: async (input) => {
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

			return {
				type: "ready",
				data: {
					scopes: options.requiredScopes?.(parsedInput.data) ?? [],
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
									"Tool failed",
							};
						}

						const output = await options.output.safeParseAsync(
							result.data.output,
						);
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
								message: "Tool returned invalid output",
							};
						}

						return {
							type: "success",
							data: { output: output.data, content: result.data.content },
						};
					},
				},
			};
		},
	},
});

export default defineTool;

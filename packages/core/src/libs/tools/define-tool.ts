import type { z } from "zod";
import prepareToolInput from "./prepare-input.js";
import { toolDefinitionInternal } from "./registry.js";
import type {
	AgentToolDefinition,
	DefineAgentToolOptions,
	DefineMcpToolOptions,
	DefineToolOptions,
	McpToolDefinition,
	ToolDefinition,
} from "./types.js";

function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: DefineAgentToolOptions<Name, Input, Output>,
): AgentToolDefinition<Name>;
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(options: DefineMcpToolOptions<Name, Input, Output>): McpToolDefinition<Name>;
/** Each definition belongs to one transport; handlers can share application services. */
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(options: DefineToolOptions<Name, Input, Output>): ToolDefinition<Name> {
	const definition = {
		type: "tool-definition" as const,
		name: options.name,
		description: options.description,
		input: options.input,
		output: options.output,
	};

	if (options.target === "agent") {
		return {
			...definition,
			target: "agent",
			permissions: options.permissions,
			readOnly: options.readOnly ?? false,
			[toolDefinitionInternal]: {
				prepareInput: (input) =>
					prepareToolInput(
						{ ...options, requirements: options.requiredPermissions },
						input,
					),
			},
		};
	}

	return {
		...definition,
		target: options.target,
		scopes: options.scopes,
		annotations: options.annotations,
		advertisedScopes: options.advertisedScopes,
		[toolDefinitionInternal]: {
			prepareInput: (input) =>
				prepareToolInput(
					{ ...options, requirements: options.requiredScopes },
					input,
				),
		},
	};
}

export default defineTool;

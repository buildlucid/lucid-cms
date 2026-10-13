import type { z } from "zod";
import prepareToolInput, { checkToolResult } from "./prepare-input.js";
import {
	toolDefinitionBase,
	toolDefinitionInternal,
} from "./tool-definition-internal.js";
import type { DefineMcpToolOptions, McpToolDefinition } from "./types.js";

/**
 * Defines a tool for Lucid's MCP server. Register it with `ai.mcp.tools`. Its
 * handler receives the caller's scopes; check them before returning scoped data.
 */
const defineMcpTool = <
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: DefineMcpToolOptions<Name, Input, Output>,
): McpToolDefinition<Name> => {
	const checkResult = checkToolResult(options);

	return {
		...toolDefinitionBase(options),
		kind: "mcp",
		scopes: options.scopes,
		annotations: options.annotations,
		possibleScopes: options.possibleScopes,
		[toolDefinitionInternal]: {
			prepareInput: (input) =>
				prepareToolInput(
					{ ...options, requirements: options.inputScopes, checkResult },
					input,
				),
		},
	};
};

export default defineMcpTool;

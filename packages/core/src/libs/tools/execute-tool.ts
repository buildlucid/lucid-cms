import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import { filterExternalScopes } from "../permission/scopes.js";
import { getToolRegistry, toolDefinitionInternal } from "./registry.js";
import type { ToolExecution, ToolRunResult } from "./types.js";

/** Executes a registered tool with current, effective scopes. */
export const executeTool = async (args: {
	context: ServiceContext;
	name: string;
	input: unknown;
	execution: ToolExecution;
}): Promise<ToolRunResult | { type: "not-found" } | { type: "forbidden" }> => {
	const { config } = args.context;
	const tool = getToolRegistry(config).get(args.name);
	if (!tool) return { type: "not-found" };

	const scopes = new Set(
		filterExternalScopes(
			config,
			args.execution.authority.scopes,
			args.execution.authority.principal.type,
		),
	);
	if (tool.scopes.some((scope) => !scopes.has(scope))) {
		return { type: "forbidden" };
	}

	try {
		return await tool[toolDefinitionInternal].run({
			context: args.context,
			input: args.input,
			execution: args.execution,
		});
	} catch (error) {
		logger.error({
			event: "tools.execution.failed",
			message: `Tool ${tool.name} failed`,
			error,
		});

		return { type: "failed", message: "Tool failed" };
	}
};

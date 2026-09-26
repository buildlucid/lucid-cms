import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import { getValidPermissions } from "../permission/registry.js";
import { filterExternalScopes } from "../permission/scopes.js";
import { getMcpToolRegistry, toolDefinitionInternal } from "./registry.js";
import type {
	AgentToolDefinition,
	AgentToolExecution,
	McpToolExecution,
	ToolPreparationResult,
} from "./types.js";

type ExecutionArgs<Execution> = {
	context: ServiceContext;
	input: unknown;
	execution: Execution;
};

/** Keeps parsing, execution and error handling common while authority stays target-specific. */
const execute = async <Execution, Result, Requirement>(
	args: ExecutionArgs<Execution>,
	tool:
		| {
				name: string;
				[toolDefinitionInternal]: {
					prepareInput: (
						input: unknown,
					) => Promise<ToolPreparationResult<Execution, Result, Requirement>>;
				};
		  }
		| undefined,
	requirements: readonly Requirement[],
	allowed: (requirements: readonly Requirement[]) => boolean,
) => {
	if (!tool) return { type: "not-found" as const };
	if (!allowed(requirements)) return { type: "forbidden" as const };

	try {
		const preparation = await tool[toolDefinitionInternal].prepareInput(
			args.input,
		);
		if (preparation.type === "invalid-input") return preparation;
		if (!allowed(preparation.data.requirements)) {
			return { type: "forbidden" as const };
		}

		return await preparation.data.run({
			context: args.context,
			execution: args.execution,
		});
	} catch (error) {
		logger.error({
			event: "tools.execution.failed",
			message: `Tool ${tool.name} failed`,
			error,
		});
		return {
			type: "failed" as const,
			message: args.context.translate("server:core.tools.failed"),
		};
	}
};

export const executeMcpTool = (
	args: ExecutionArgs<McpToolExecution> & { name: string },
) => {
	const tool = getMcpToolRegistry(args.context.config).get(args.name);
	const scopes = new Set(
		filterExternalScopes(
			args.context.config,
			args.execution.authority.scopes,
			args.execution.authority.principal.type,
		),
	);

	return execute(args, tool, tool?.scopes ?? [], (required) =>
		required.every((scope) => scopes.has(scope)),
	);
};

/** Agent tools are resolved from the run's agent, since names are only unique within one agent. */
export const executeAgentTool = (
	args: ExecutionArgs<AgentToolExecution> & { tool: AgentToolDefinition },
) => {
	const permissions = new Set(getValidPermissions(args.context.config));
	const authority = args.execution.authority;

	return execute(args, args.tool, args.tool.permissions, (required) =>
		required.every(
			(permission) =>
				permissions.has(permission) &&
				(authority.superAdmin || authority.permissions.includes(permission)),
		),
	);
};

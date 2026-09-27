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
				requirements: readonly Requirement[];
				prepareInput: (
					input: unknown,
				) => Promise<ToolPreparationResult<Execution, Result, Requirement>>;
		  }
		| undefined,
	allowed: (requirements: readonly Requirement[]) => boolean,
) => {
	if (!tool) return { type: "not-found" as const };
	if (!allowed(tool.requirements)) return { type: "forbidden" as const };

	try {
		const preparation = await tool.prepareInput(args.input);
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

	return execute(
		args,
		tool && {
			name: tool.name,
			requirements: tool.scopes,
			prepareInput: tool[toolDefinitionInternal].prepareInput,
		},
		(required) => required.every((scope) => scopes.has(scope)),
	);
};

/** Agent tools act with the run's authority, limited to permissions that exist in config. */
const agentPermissionCheck = (args: ExecutionArgs<AgentToolExecution>) => {
	const permissions = new Set(getValidPermissions(args.context.config));
	const authority = args.execution.authority;

	return (required: readonly string[]) =>
		required.every(
			(permission) =>
				permissions.has(permission) &&
				(authority.superAdmin || authority.permissions.includes(permission)),
		);
};

/** Agent tools are resolved from the run's agent, since names are only unique within one agent. */
export const executeAgentTool = (
	args: ExecutionArgs<AgentToolExecution> & { tool: AgentToolDefinition },
) =>
	execute(
		args,
		{
			name: args.tool.name,
			requirements: args.tool.permissions,
			prepareInput: args.tool[toolDefinitionInternal].prepareInput,
		},
		agentPermissionCheck(args),
	);

/** Runs an interactive tool's read-only preparation with the same input and permission checks as its handler. */
export const prepareAgentTool = (
	args: ExecutionArgs<AgentToolExecution> & { tool: AgentToolDefinition },
) => {
	const interaction = args.tool[toolDefinitionInternal].interaction;

	return execute(
		args,
		interaction && {
			name: args.tool.name,
			requirements: args.tool.permissions,
			prepareInput: interaction.prepareInput,
		},
		agentPermissionCheck(args),
	);
};

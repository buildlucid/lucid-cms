import type {
	ContentBlock,
	ToolAnnotations,
} from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidExternalAuth } from "../../types/hono.js";
import type { JsonValue } from "../../utils/helpers/is-json-object.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import type { Permission } from "../permission/types.js";
import { toolDefinitionInternal } from "./registry.js";

export type McpToolAuthority = Pick<LucidExternalAuth, "principal" | "scopes">;

/** Current permissions of the user who started the chat or owns the routine. */
export type AgentToolAuthority = {
	userId: number;
	permissions: readonly string[];
	superAdmin: boolean;
};

export type McpToolExecution = {
	authority: McpToolAuthority;
	signal: AbortSignal;
};
export type AgentToolExecution = {
	authority: AgentToolAuthority;
	signal: AbortSignal;
	/** Stable per tool call. Use for idempotent writes. */
	operationId: string;
};

export type McpToolResult<Output> = {
	output: Output;
	/** Replaces the default JSON text block, eg. to return an image. */
	content?: ContentBlock[];
	widgets?: never;
};
export type AgentToolResult<Output> = {
	output: Output;
	/** Trusted UI data rendered through the agent.widget slot. */
	widgets?: { key: string; version: number; data: Record<string, JsonValue> }[];
	content?: never;
};

export type ToolHandler<Input, Result, Execution> = (args: {
	context: ServiceContext;
	input: Input;
	execution: Execution;
}) => ServiceResponse<Result>;

export type AgentToolHandler<Input, Output> = ToolHandler<
	Input,
	AgentToolResult<Output>,
	AgentToolExecution
>;
export type McpToolHandler<Input, Output> = ToolHandler<
	Input,
	McpToolResult<Output>,
	McpToolExecution
>;

type ToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = {
	/** Unique within this target. Prefix plugin tools to avoid collisions. */
	name: Name;
	description: string;
	input: Input;
	output: Output;
};

type ToolScopeOptions<Input> =
	| {
			requiredScopes: (input: Input) => readonly ExternalScope[];
			advertisedScopes: (
				config: ResolvedLucidConfig,
			) => readonly ExternalScope[];
	  }
	| { requiredScopes?: never; advertisedScopes?: never };

export type DefineMcpToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output> &
	ToolScopeOptions<z.output<Input>> & {
		target: "mcp";
		permissions?: never;
		requiredPermissions?: never;
		readOnly?: never;
		scopes: readonly ExternalScope[];
		annotations?: ToolAnnotations;
		handler: McpToolHandler<z.output<Input>, z.output<Output>>;
	};

export type DefineAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output> & {
	target: "agent";
	scopes?: never;
	requiredScopes?: never;
	advertisedScopes?: never;
	annotations?: never;
	/** Pass [] for tools available to every user with agent access. */
	permissions: readonly Permission[];
	requiredPermissions?: (input: z.output<Input>) => readonly Permission[];
	/** Writes require approval in chat and pause unattended routines. Defaults to false. */
	readOnly?: boolean;
	handler: AgentToolHandler<z.output<Input>, z.output<Output>>;
};

export type DefineToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> =
	| DefineMcpToolOptions<Name, Input, Output>
	| DefineAgentToolOptions<Name, Input, Output>;

export type ToolRunResult<Result> =
	| { type: "success"; data: Result }
	| { type: "invalid-input"; message: string }
	| { type: "failed"; message: string };

export type ToolPreparationResult<Execution, Result, Requirement> =
	| {
			type: "ready";
			data: {
				requirements: readonly Requirement[];
				run: (args: {
					context: ServiceContext;
					execution: Execution;
				}) => Promise<ToolRunResult<Result>>;
			};
	  }
	| { type: "invalid-input"; message: string };

type Definition<Name extends string, Execution, Result, Requirement> = {
	readonly type: "tool-definition";
	readonly name: Name;
	readonly description: string;
	readonly input: z.ZodObject;
	readonly output: z.ZodObject;
	readonly [toolDefinitionInternal]: {
		readonly prepareInput: (
			input: unknown,
		) => Promise<ToolPreparationResult<Execution, Result, Requirement>>;
	};
};

export type McpToolDefinition<Name extends string = string> = Definition<
	Name,
	McpToolExecution,
	McpToolResult<Record<string, JsonValue>>,
	ExternalScope
> & {
	readonly target: "mcp";
	readonly scopes: readonly ExternalScope[];
	readonly annotations?: ToolAnnotations;
	readonly advertisedScopes?: (
		config: ResolvedLucidConfig,
	) => readonly ExternalScope[];
};
export type AgentToolDefinition<Name extends string = string> = Definition<
	Name,
	AgentToolExecution,
	AgentToolResult<Record<string, JsonValue>>,
	Permission
> & {
	readonly target: "agent";
	readonly permissions: readonly Permission[];
	readonly readOnly: boolean;
};

/** An opaque tool definition created with defineTool. */
export type ToolDefinition<Name extends string = string> =
	| AgentToolDefinition<Name>
	| McpToolDefinition<Name>;

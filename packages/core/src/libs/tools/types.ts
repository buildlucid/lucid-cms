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
import type { RunMode } from "../agent/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import type { Permission } from "../permission/types.js";
import type { Toolkit } from "../toolkit/types.js";
import { toolDefinitionInternal } from "./tool-definition-internal.js";

export type McpToolAuthority = Pick<LucidExternalAuth, "principal" | "scopes">;

/** Who an agent run acts for, with their current permissions. Routines defined in code act as the system. */
export type AgentToolAuthority = {
	principal: { type: "user"; userId: number } | { type: "system" };
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
	/** The agent run making the call, eg. to attribute usage or read its conversation. */
	run: { id: string; conversationId: string; userId: number | null };
	/** Saved input supplied by the runner after an interaction. */
	interaction?: {
		data: Record<string, unknown>;
		response: Record<string, unknown>;
	};
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
	/** Trusted server helpers. They do not check the caller's permissions or scopes. */
	toolkit: Toolkit;
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

export type AgentToolDescriptionProps = { mode: RunMode };

export type AgentToolDescription =
	| string
	| ((props: AgentToolDescriptionProps) => string);

type ToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Description = string,
> = {
	/** Unique among MCP tools, or within an agent. Prefix plugin tools to avoid collisions. */
	name: Name;
	/** A plain-language name shown to people, eg. "Save note". Agent tools default to the name with spaces. */
	title?: AdminCopyInput;
	description: Description;
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
		scopes: readonly ExternalScope[];
		annotations?: ToolAnnotations;
		handler: McpToolHandler<z.output<Input>, z.output<Output>>;
	};

export type DefineAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output, AgentToolDescription> & {
	/** Pass [] for tools available to every user with agent access. */
	permissions: readonly Permission[];
	requiredPermissions?: (input: z.output<Input>) => readonly Permission[];
	/** Whether the handler only reads data. Defaults to false. Writes are checkpointed before execution for safe recovery. */
	readOnly?: boolean;
	/** Ask before executing in tool-defaults mode. Routines can override this. Defaults to false. */
	requiresApproval?: boolean;
	handler: AgentToolHandler<z.output<Input>, z.output<Output>>;
};

/** Read-only preparation either completes the call or asks for one structured response. */
export type AgentToolInteraction<Data> = {
	interaction: {
		title: string;
		placement: "inline" | "composer";
		data: Data;
	};
};

export type DefineInteractiveAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodObject,
	Response extends z.ZodObject,
> = Omit<DefineAgentToolOptions<Name, Input, Output>, "handler"> & {
	interaction: {
		/** Matches an `agent.widget` admin slot. Keys starting with `lucid-` are reserved. */
		key: string;
		/** Bump when the data or response shape changes, so saved interactions stop matching. */
		version: number;
		data: Data;
		/** Derive allowed responses from the saved data, rather than trusting the browser. */
		response: (data: z.output<Data>) => Response;
		/** Read-only and safe to retry. Return an interaction to ask the person, or a result to finish without asking. */
		prepare: ToolHandler<
			z.output<Input>,
			AgentToolInteraction<z.input<Data>> | AgentToolResult<z.output<Output>>,
			AgentToolExecution
		>;
	};
	/** Runs once the person submits, with the saved data and their response. */
	handler: (
		args: Parameters<AgentToolHandler<z.output<Input>, z.output<Output>>>[0] & {
			data: z.output<Data>;
			response: z.output<Response>;
		},
	) => ServiceResponse<AgentToolResult<z.output<Output>>>;
};

export type AgentToolPreparation =
	| AgentToolResult<Record<string, JsonValue>>
	| AgentToolInteraction<Record<string, JsonValue>>;

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

type Definition<
	Name extends string,
	Execution,
	Result,
	Requirement,
	Description = string,
> = {
	readonly type: "tool-definition";
	readonly name: Name;
	readonly description: Description;
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
	/** Sent to MCP clients only when set; they fall back to the name. */
	readonly title?: ResolvedAdminCopy;
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
	Permission,
	AgentToolDescription
> & {
	readonly target: "agent";
	readonly title: ResolvedAdminCopy;
	readonly permissions: readonly Permission[];
	readonly readOnly: boolean;
	readonly requiresApproval: boolean;
	readonly interaction?: { readonly key: string; readonly version: number };
	readonly [toolDefinitionInternal]: {
		readonly interaction?: {
			readonly prepareInput: (
				input: unknown,
			) => Promise<
				ToolPreparationResult<
					AgentToolExecution,
					AgentToolPreparation,
					Permission
				>
			>;
			/** Checks a response against the saved data, returning it ready to save. */
			readonly parseResponse: (
				data: unknown,
				response: unknown,
			) => ServiceResponse<Record<string, JsonValue>>;
		};
	};
};

/** An opaque tool created with `defineMcpTool` for `ai.mcp.tools`, or `defineAgentTool` for an agent's `tools`. */
export type ToolDefinition<Name extends string = string> =
	| AgentToolDefinition<Name>
	| McpToolDefinition<Name>;

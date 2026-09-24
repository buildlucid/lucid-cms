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
import { toolDefinitionInternal } from "./registry.js";

/** Verified caller information shared by every tool transport. */
export type ToolAuthority = Pick<LucidExternalAuth, "principal" | "scopes">;

export type ToolExecution = {
	authority: ToolAuthority;
	signal: AbortSignal;
};

/** What a tool handler returns. `output` must match the tool's output schema. */
export type ToolResult<Output> = {
	output: Output;
	/** Replaces the default JSON text block, eg. to return an image. */
	content?: ContentBlock[];
};

export type ToolHandler<Input, Output> = (args: {
	context: ServiceContext;
	input: Input;
	execution: ToolExecution;
}) => ServiceResponse<ToolResult<Output>>;

type ToolScopeOptions<Input> =
	| {
			/** Additional scopes selected from the parsed input. */
			requiredScopes: (input: Input) => readonly ExternalScope[];
			/** Every scope a client may need when calling this tool. */
			advertisedScopes: (
				config: ResolvedLucidConfig,
			) => readonly ExternalScope[];
	  }
	| {
			requiredScopes?: never;
			advertisedScopes?: never;
	  };

export type DefineToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = {
	target: "mcp";
	/** Stable, unique tool name. Prefix plugin tools to avoid collisions. */
	name: Name;
	description: string;
	input: Input;
	output: Output;
	/** Scopes the caller must hold. Pass `[]` to allow any authenticated caller. */
	scopes: readonly ExternalScope[];
	annotations?: ToolAnnotations;
	handler: ToolHandler<z.output<Input>, z.output<Output>>;
} & ToolScopeOptions<z.output<Input>>;

export type PreparedToolInput = {
	scopes: readonly ExternalScope[];
	run: (args: {
		context: ServiceContext;
		execution: ToolExecution;
	}) => Promise<ToolRunResult>;
};

export type ToolPreparationResult =
	| { type: "ready"; data: PreparedToolInput }
	| { type: "invalid-input"; message: string };

export type ToolRunResult =
	| { type: "success"; data: ToolResult<Record<string, JsonValue>> }
	| { type: "invalid-input"; message: string }
	| { type: "failed"; message: string };

/** An opaque tool definition created with `defineTool`. */
export type ToolDefinition<Name extends string = string> = {
	readonly type: "tool-definition";
	readonly target: "mcp";
	readonly name: Name;
	readonly description: string;
	readonly input: z.ZodObject;
	readonly output: z.ZodObject;
	readonly scopes: readonly ExternalScope[];
	readonly annotations?: ToolAnnotations;
	readonly advertisedScopes?: (
		config: ResolvedLucidConfig,
	) => readonly ExternalScope[];
	readonly [toolDefinitionInternal]: {
		readonly prepareInput: (input: unknown) => Promise<ToolPreparationResult>;
	};
};

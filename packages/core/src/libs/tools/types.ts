import type { z } from "zod";
import type { LucidExternalAuth } from "../../types/hono.js";
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

export type ToolHandler<Input, Output> = (args: {
	context: ServiceContext;
	input: Input;
	execution: ToolExecution;
}) => ServiceResponse<Output>;

export type DefineToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = {
	/** Stable, unique tool name. Prefix plugin tools to avoid collisions. */
	name: Name;
	description: string;
	input: Input;
	output: Output;
	/** Scopes the caller must hold. Pass `[]` to allow any authenticated caller. */
	scopes: readonly ExternalScope[];
	handler: ToolHandler<z.output<Input>, z.output<Output>>;
};

export type ToolRunResult =
	| { type: "success"; data: Record<string, unknown> }
	| { type: "invalid-input"; message: string }
	| { type: "failed"; message: string };

/** An opaque tool definition created with `defineTool`. */
export type ToolDefinition<Name extends string = string> = {
	readonly type: "tool-definition";
	readonly name: Name;
	readonly description: string;
	readonly input: z.ZodObject;
	readonly output: z.ZodObject;
	readonly scopes: readonly ExternalScope[];
	readonly [toolDefinitionInternal]: {
		readonly run: (args: {
			context: ServiceContext;
			input: unknown;
			execution: ToolExecution;
		}) => Promise<ToolRunResult>;
	};
};

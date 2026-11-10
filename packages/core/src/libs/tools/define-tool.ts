import type { ContentBlock } from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { AdminCopyInput } from "../i18n/types.js";
import defineAgentTool from "./define-agent-tool.js";
import defineMcpTool from "./define-mcp-tool.js";
import type {
	AgentToolAnswer,
	AgentToolBaseOptions,
	AgentToolDefinition,
	AgentToolDescription,
	AgentToolListItem,
	AgentToolExecution,
	AgentToolInteraction,
	AgentToolResult,
	DefineInteractiveAgentToolOptions,
	McpToolAnnotations,
	McpToolDefinition,
	McpToolExecution,
	Tool,
	ToolHandler,
	ToolOptions,
	ToolScopeOptions,
} from "./types.js";

type AgentExecution = AgentToolExecution & { surface: "agent" };
type McpExecution = McpToolExecution & { surface: "mcp" };

/** What a tool returns. A surface ignores the parts it has no use for. */
export type ToolResult<Output> = Pick<
	AgentToolResult<Output>,
	"output" | "widgets" | "changes"
> & {
	/** Agents only. Short, factual admin copy shown in the transcript, defaulting to the tool's title. */
	summary?: AdminCopyInput;
	/** MCP only. Replaces the default JSON text block, eg. to return an image. */
	content?: ContentBlock[];
};

/** What the tool is. Everything about how a surface offers it goes in that surface's block. */
type ToolBase<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Description = string,
> = ToolOptions<Name, Input, Output, Description> & {
	/** The handler changes nothing, defaulting to false. Agents checkpoint writes; MCP clients are told it only reads. */
	readOnly?: boolean;
};

/** How agents are offered the tool. */
type ToolAgentBlock<Input extends z.ZodObject> = Omit<
	AgentToolBaseOptions<string, Input, z.ZodObject>,
	keyof ToolOptions<string, Input, z.ZodObject> | "readOnly" | "parallelSafe"
> & {
	/** Allows independent reads to run concurrently. Only applies when the tool is `readOnly`. */
	parallelSafe?: boolean;
};

/** How MCP clients are offered the tool. */
type ToolMcpBlock<Input extends z.ZodObject> = ToolScopeOptions<
	z.output<Input>
> & {
	scopes: McpToolDefinition["scopes"];
	/** Extra behaviour hints. `readOnlyHint` comes from the tool's `readOnly`. */
	annotations?: Omit<McpToolAnnotations, "readOnlyHint">;
};

type Handler<
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Execution,
> = ToolHandler<z.output<Input>, ToolResult<z.output<Output>>, Execution>;

/**
 * Defines a tool once for agents, MCP clients or both.
 * The top level says what the tool is; an `agent` or `mcp` block says how that surface offers it,
 * and the tool is only offered on surfaces it has a block for. List it in an agent's `tools` or in `ai.mcp.tools`.
 *
 * @example
 * ```ts
 * const echoTool = defineTool({
 *   name: "site_echo",
 *   description: "Return the supplied message unchanged.",
 *   input: z.object({ message: z.string() }),
 *   output: z.object({ message: z.string() }),
 *   readOnly: true,
 *   agent: { permissions: [] },
 *   mcp: { scopes: [] },
 *   handler: ({ input }) => ({ output: { message: input.message } }),
 * });
 * ```
 */
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodType<Record<string, unknown>>,
	Response extends z.ZodType<Record<string, unknown>>,
	Skippable extends boolean = false,
>(
	options: ToolBase<Name, Input, Output, AgentToolDescription> & {
		agent: ToolAgentBlock<Input> &
			Pick<
				DefineInteractiveAgentToolOptions<
					Name,
					Input,
					Output,
					Data,
					Response,
					Skippable
				>,
				"interaction"
			>;
		mcp?: never;
		/** Handles an answer or a skipped interaction, and may ask again before writing anything. */
		handler: (
			args: Parameters<Handler<Input, Output, AgentExecution>>[0] &
				AgentToolAnswer<Data, Response, Skippable>,
		) =>
			| ToolResult<z.output<Output>>
			| AgentToolInteraction<z.input<Data>>
			| Promise<
					ToolResult<z.output<Output>> | AgentToolInteraction<z.input<Data>>
			  >;
	},
): Tool<Name, "agent">;
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: ToolBase<Name, Input, Output> & {
		agent: ToolAgentBlock<Input>;
		mcp: ToolMcpBlock<Input>;
		handler: Handler<Input, Output, AgentExecution | McpExecution>;
	},
): Tool<Name, "agent" | "mcp">;
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: ToolBase<Name, Input, Output, AgentToolDescription> & {
		agent: ToolAgentBlock<Input>;
		mcp?: never;
		handler: Handler<Input, Output, AgentExecution>;
	},
): Tool<Name, "agent">;
function defineTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: ToolBase<Name, Input, Output> & {
		agent?: never;
		mcp: ToolMcpBlock<Input>;
		handler: Handler<Input, Output, McpExecution>;
	},
): Tool<Name, "mcp">;
function defineTool(
	options: ToolBase<string, z.ZodObject, z.ZodObject, AgentToolDescription> & {
		agent?: ToolAgentBlock<z.ZodObject> & {
			interaction?: DefineInteractiveAgentToolOptions<
				string,
				z.ZodObject,
				z.ZodObject,
				z.ZodType<Record<string, unknown>>,
				z.ZodType<Record<string, unknown>>,
				boolean
			>["interaction"];
		};
		mcp?: ToolMcpBlock<z.ZodObject>;
		// oxlint-disable-next-line typescript/no-explicit-any -- the overloads type each handler; this signature only joins them
		handler: (args: any) => any;
	},
) {
	const { agent, mcp, handler, readOnly, ...base } = options;
	const title = base.title ?? base.name.replaceAll("_", " ");

	return {
		type: "tool" as const,
		name: base.name,
		...(agent && {
			agent: defineAgentTool({
				...base,
				...agent,
				...(readOnly
					? { readOnly: true, parallelSafe: agent.parallelSafe }
					: { readOnly: false }),
				handler: async (args) => {
					const result = await handler({
						...args,
						execution: { ...args.execution, surface: "agent" },
					});
					//* an interactive handler may ask again instead of finishing
					if ("interaction" in result) return result;
					return {
						output: result.output,
						summary: result.summary ?? title,
						widgets: result.widgets,
						changes: result.changes,
					};
				},
			} as Parameters<typeof defineAgentTool>[0]),
		}),
		...(mcp && {
			mcp: defineMcpTool({
				...base,
				//* only tools with an `agent` block alone can vary their description
				description: String(base.description),
				...mcp,
				annotations: { ...mcp.annotations, readOnlyHint: readOnly ?? false },
				handler: async (args) => {
					const result = await handler({
						...args,
						execution: { ...args.execution, surface: "mcp" },
					});
					return { output: result.output, content: result.content };
				},
			}),
		}),
	};
}

export default defineTool;

const isTool = (value: unknown): value is Tool =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "tool";

/** The agent definitions of a `tools` list, which may hold `defineTool` tools and bundles such as `agentTools.read()`. */
export const toAgentTools = (
	tools: readonly (AgentToolListItem | readonly AgentToolListItem[])[],
): AgentToolDefinition[] =>
	tools.flat().map((tool) => (tool.type === "tool" ? tool.agent : tool));

/** The MCP definitions of an `ai.mcp.tools` list, leaving anything else for the config schema to reject. */
export const toMcpTools = (tools: readonly unknown[]): unknown[] =>
	tools.flat().map((tool) => (isTool(tool) && "mcp" in tool ? tool.mcp : tool));

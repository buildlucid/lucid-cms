import {
	type CallToolResult,
	createMcpHandler,
	McpServer,
	type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import type { z } from "zod";
import packageJson from "../../../package.json" with { type: "json" };
import type { JsonValue } from "../../utils/helpers/is-json-object.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import { filterExternalScopes } from "../permission/scopes.js";
import { executeTool } from "../tools/execute-tool.js";
import { getToolRegistry } from "../tools/registry.js";
import type { ToolAuthority, ToolResult } from "../tools/types.js";

/** Keeps text results small enough for a model's context. Images are bounded by their tools. */
const MAX_TEXT_RESULT_BYTES = 64 * 1024;

/**
 * Advertises a tool schema to MCP clients without letting the SDK parse values.
 * Tools validate their own input and output, so every transport parses once.
 */
const advertiseSchema = (schema: z.ZodObject): StandardSchemaWithJSON => ({
	"~standard": {
		...schema["~standard"],
		validate: (value) => ({ value }),
	},
});

/** Builds the MCP result, defaulting to the output as JSON text. */
const toCallToolResult = (
	context: ServiceContext,
	result: ToolResult<Record<string, JsonValue>>,
): CallToolResult => {
	const content = result.content ?? [
		{ type: "text", text: JSON.stringify(result.output) },
	];
	const textBytes = new TextEncoder().encode(
		JSON.stringify({
			content: content.filter((block) => block.type === "text"),
			structuredContent: result.output,
		}),
	).byteLength;
	if (textBytes > MAX_TEXT_RESULT_BYTES) {
		return {
			isError: true,
			content: [
				{
					type: "text",
					text:
						context.translate(copy("server:core.mcp.result.too.large")) ??
						"Tool result is too large",
				},
			],
		};
	}

	return { content, structuredContent: result.output };
};

/** Adapts the shared tool registry to both MCP protocol generations. */
export const createToolHandler = (args: {
	context: ServiceContext;
	authority: ToolAuthority;
}) => {
	const { context, authority } = args;
	const effectiveScopes = new Set(
		filterExternalScopes(
			context.config,
			authority.scopes,
			authority.principal.type,
		),
	);

	return createMcpHandler(() => {
		const server = new McpServer(
			{ name: "lucid-cms", version: packageJson.version },
			{
				capabilities: { tools: { listChanged: false } },
				instructions:
					"Use this server for tasks involving live content and resources in the connected Lucid CMS instance. Lucid is a configurable CMS; discover its content model and supported operations through the available tools. Use collection and field definitions to guide content queries rather than assuming a particular content structure.",
			},
		);

		for (const tool of getToolRegistry(context.config).values()) {
			if (tool.scopes.some((scope) => !effectiveScopes.has(scope))) continue;

			server.registerTool(
				tool.name,
				{
					description: tool.description,
					inputSchema: advertiseSchema(tool.input),
					outputSchema: advertiseSchema(tool.output),
					annotations: tool.annotations,
				},
				async (input, request) => {
					const result = await executeTool({
						context,
						name: tool.name,
						input,
						execution: { authority, signal: request.mcpReq.signal },
					});
					if (result.type === "success") {
						return toCallToolResult(context, result.data);
					}

					return {
						isError: true,
						content: [
							{
								type: "text",
								text:
									result.type === "not-found"
										? "Tool is unavailable"
										: result.type === "forbidden"
											? "Tool scope is required"
											: result.message,
							},
						],
					};
				},
			);
		}
		return server;
	});
};

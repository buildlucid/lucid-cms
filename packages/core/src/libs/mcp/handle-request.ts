import {
	DEFAULT_MAX_REQUEST_BODY_SIZE,
	readRequestBody,
} from "@modelcontextprotocol/server";
import z from "zod";
import type { ServiceContext } from "../../utils/services/types.js";
import {
	type ExternalScope,
	ExternalScopes,
} from "../permission/external-scopes.js";
import { getToolRegistry, toolDefinitionInternal } from "../tools/registry.js";
import type { ToolAuthority } from "../tools/types.js";
import { createToolHandler } from "./create-tool-handler.js";

const toolCallSchema = z.object({
	method: z.literal("tools/call"),
	params: z.object({
		name: z.string(),
		arguments: z.unknown().optional(),
	}),
});

/** Bounds the HTTP body, checks tool scopes and delegates MCP to the SDK. */
export const handleMcpRequest = async (args: {
	request: Request;
	context: ServiceContext;
	authority: ToolAuthority;
	requireScopes: (scopes: readonly ExternalScope[]) => void;
}): Promise<Response> => {
	const { request, context, authority, requireScopes } = args;
	let parsedBody: unknown;

	if (request.method === "POST") {
		const body = await readRequestBody(
			request.clone(),
			DEFAULT_MAX_REQUEST_BODY_SIZE,
		);
		if (body.tooLarge) {
			return new Response("Request body too large", { status: 413 });
		}

		try {
			parsedBody = JSON.parse(body.text);
		} catch {
			// Leave invalid JSON to the SDK's protocol error handling.
		}

		const toolCall = toolCallSchema.safeParse(parsedBody);
		if (
			toolCall.success &&
			(!request.headers.get("Mcp-Method") ||
				request.headers.get("Mcp-Method") === toolCall.data.method) &&
			(!request.headers.get("Mcp-Name") ||
				request.headers.get("Mcp-Name") === toolCall.data.params.name)
		) {
			const tool = getToolRegistry(context.config).get(
				toolCall.data.params.name,
			);

			if (tool) {
				// Parses the raw arguments here only to challenge for input-dependent scopes.
				const preparation = await tool[toolDefinitionInternal].prepareInput(
					toolCall.data.params.arguments ?? {},
				);
				const requiredScopes = [
					...tool.scopes,
					...(preparation.type === "ready" ? preparation.data.scopes : []),
				];
				if (requiredScopes.length > 0) {
					requireScopes([ExternalScopes.McpAccess, ...requiredScopes]);
				}
			}
		}
	}

	return createToolHandler({ context, authority }).fetch(request, {
		parsedBody,
	});
};

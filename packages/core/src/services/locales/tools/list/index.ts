import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import listLocales from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listLocalesMcpTool = defineTool({
	target: "mcp",
	name: "locales_list",
	description:
		"List available content languages and CMS interface languages, including each default locale. Use page and perPage for more locales.",
	input: inputSchema,
	output: outputSchema,
	scopes: [ExternalScopes.LocalesRead],
	annotations: { readOnlyHint: true },
	handler: ({ context, input }) => listLocales(context, { input }),
});

export const listLocalesAgentTool = defineTool({
	target: "agent",
	name: "locales_list",
	description:
		"List available content languages and CMS interface languages, including each default locale. Use page and perPage for more locales.",
	input: inputSchema,
	output: outputSchema,
	permissions: [],
	readOnly: true,
	handler: ({ context, input }) => listLocales(context, { input }),
});

import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import listLocales from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listLocalesMcpTool = () =>
	defineMcpTool({
		name: "locales_list",
		title: copy("admin:core.tools.locales_list.title"),
		description:
			"List available content languages and CMS interface languages, including each default locale. Use page and perPage for more locales.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.LocalesRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input }) => listLocales(context, { input }),
	});

export const listLocalesAgentTool = () =>
	defineAgentTool({
		name: "locales_list",
		title: copy("admin:core.tools.locales_list.title"),
		description:
			"List available content languages and CMS interface languages, including each default locale. Use page and perPage for more locales.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		handler: ({ context, input }) => listLocales(context, { input }),
	});

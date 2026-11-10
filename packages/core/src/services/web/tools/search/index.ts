import type { AgentLucidToolName } from "@lucidcms/types";
import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import type { WebToolOptions } from "../../helpers/web-tool-options.js";
import searchWeb from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const webSearchToolName = "web_search" satisfies AgentLucidToolName;

/** Takes options `defineAgent` has already checked with `resolveWebToolOptions`. */
export const webSearchAgentTool = ({ allowedDomains }: WebToolOptions = {}) =>
	defineTool({
		name: webSearchToolName,
		title: copy("admin:core.tools.web_search.title"),
		description:
			"Search the public web for information. Returns up to five source URLs with excerpts, which may be cached. Queries go to an external provider and must not include private CMS content or secrets.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			outputVersion: 1,
			permissions: [],
			capabilities: { web: { search: true } },
			available: ({ aiAccess }) => aiAccess.includes("web_research"),
		},
		handler: async ({ context, input, execution }) => {
			const result = await searchWeb(context, {
				input,
				execution,
				allowedDomains,
			});
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).agent;

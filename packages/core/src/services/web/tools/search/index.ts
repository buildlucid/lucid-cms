import type { AgentLucidToolName } from "@lucidcms/types";
import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { WebToolOptions } from "../../helpers/web-tool-options.js";
import searchWeb from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const webSearchToolName = "web_search" satisfies AgentLucidToolName;

/** Takes options `defineAgent` has already checked with `resolveWebToolOptions`. */
export const webSearchAgentTool = ({ allowedDomains }: WebToolOptions = {}) =>
	defineAgentTool({
		name: webSearchToolName,
		title: copy("admin:core.tools.web_search.title"),
		description:
			"Search the public web for information. Returns up to five source URLs with excerpts, which may be cached. Queries go to an external provider and must not include private CMS content or secrets.",
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		readOnly: true,
		capabilities: { web: { search: true } },
		available: ({ aiAccess }) => aiAccess.includes("web_research"),
		handler: ({ context, input, execution }) =>
			searchWeb(context, { input, execution, allowedDomains }),
	});

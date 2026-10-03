import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import {
	resolveWebToolOptions,
	type WebToolOptions,
} from "../../helpers/web-tool-options.js";
import fetchWeb from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const webFetchToolName = "web_fetch" satisfies AgentLucidToolName;

export const webFetchAgentTool = (options: WebToolOptions = {}) => {
	const { allowedDomains } = resolveWebToolOptions(options);

	return defineAgentTool({
		name: webFetchToolName,
		title: copy("admin:core.tools.web_fetch.title"),
		description:
			"Read a public webpage from a URL already present in this chat or its tool results. Returns text and links, optionally selected for an objective. Results may be cached or partial; private and authenticated pages are inaccessible.",
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		readOnly: true,
		capabilities: { webRead: true },
		handler: ({ context, input, execution }) =>
			fetchWeb(context, { input, execution, allowedDomains }),
	});
};

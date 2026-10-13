import type { AgentLucidToolName } from "@lucidcms/types";
import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { WebToolOptions } from "../../helpers/web-tool-options.js";
import readWeb from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const webReadToolName = "web_read" satisfies AgentLucidToolName;

/** Takes options `defineAgent` has already checked with `resolveWebToolOptions`. */
export const webReadAgentTool = ({ allowedDomains }: WebToolOptions = {}) =>
	defineAgentTool({
		name: webReadToolName,
		title: copy("admin:core.tools.web_read.title"),
		description:
			"Read a public webpage from a URL already present in this chat or its tool results. Returns text and links, optionally selected for an objective. Results may be cached or partial; private and authenticated pages are inaccessible.",
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		readOnly: true,
		capabilities: { web: { read: true } },
		available: ({ aiAccess }) => aiAccess.includes("web_research"),
		handler: ({ context, input, execution }) =>
			readWeb(context, { input, execution, allowedDomains }),
	});

import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import { subagentReadToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Lists sub-agents, or reads one sub-agent's chat or linked resources. */
export const subagentReadAgentTool = () =>
	defineTool({
		name: subagentReadToolName,
		title: copy("admin:core.tools.lucid_subagent_read.title"),
		description:
			"Without subagentId, list this chat's sub-agents with their status. With it, read that sub-agent's chat: a paginated list of messages with previews, or one message in character pages with messageId. Use view references to list what it linked or created, such as requests and media.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [],
			parallelSafe: true,
			available: ({ mode }) => mode !== "subagent",
		},
		handler: async ({ context, input, execution }) => {
			const result = await handler(context, { input, execution });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).agent;

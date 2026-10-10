import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import getUsage from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getAiUsageAgentTool = () =>
	defineAgentTool({
		name: "ai_usage_get",
		title: copy("admin:core.tools.ai_usage_get.title"),
		description:
			"Read AI usage: the credits left on the connection, recent chats and generations with the credits and tokens they used, and daily totals over a date range. Use it to answer how much AI is being used, by whom, and whether credits are running low.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.SettingsRead],
		readOnly: true,
		handler: async ({ context, input, execution }) => {
			const result = await getUsage(context, {
				input,
				viewerId: execution.run.userId,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.ai_usage_get.summary"),
				},
			};
		},
	});

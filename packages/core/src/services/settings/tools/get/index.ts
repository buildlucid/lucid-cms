import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import getSettings from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getSettingsAgentTool = () =>
	defineAgentTool({
		name: "settings_get",
		title: copy("admin:core.tools.settings_get.title"),
		description:
			"Read how this CMS is set up: the runtime, database, queue, KV, email and media adapters, media storage used and remaining, whether emails are simulated, the email templates, the AI features and agents that are on, and the MCP tools served.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.SettingsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await getSettings(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.settings_get.summary"),
				},
			};
		},
	});

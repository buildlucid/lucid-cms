import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import getEmail from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getEmailAgentTool = () =>
	defineAgentTool({
		name: "emails_get",
		title: copy("admin:core.tools.emails_get.title"),
		description:
			"Read one email: its recipients, template data, attachments and latest delivery attempts with any error messages. Set includeHtml to see the rendered email. Protected data such as reset links is redacted.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.EmailRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await getEmail(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.emails_get.summary", {
						data: { id: input.emailId },
					}),
				},
			};
		},
	});

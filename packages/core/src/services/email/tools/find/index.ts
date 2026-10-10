import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import findEmails from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findEmailsAgentTool = () =>
	defineAgentTool({
		name: "emails_find",
		title: copy("admin:core.tools.emails_find.title"),
		description:
			"Find emails the CMS has sent or tried to send, eg. to check whether an invite or password reset went out, or to list delivery failures. Returns delivery status and attempt counts. Read one with emails_get for its data, attempts and HTML.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.EmailRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await findEmails(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) return result;

			const count = result.data.output.pagination.count;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.emails_find.summary.one"
							: "admin:core.tools.emails_find.summary",
						{ data: { count } },
					),
				},
			};
		},
	});

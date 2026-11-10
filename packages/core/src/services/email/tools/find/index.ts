import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import findEmails from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findEmailsAgentTool = () =>
	defineTool({
		name: "emails_find",
		title: copy("admin:core.tools.emails_find.title"),
		description:
			"Find emails the CMS has sent or tried to send, eg. to check whether an invite or password reset went out, or to list delivery failures. Returns delivery status and attempt counts. Read one with emails_get for its data, attempts and HTML.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [Permissions.EmailRead],
			parallelSafe: true,
		},
		handler: async ({ context, input, execution }) => {
			const result = await findEmails(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) throw new LucidError(result.error);

			const count = result.data.output.pagination.count;
			return {
				output: result.data.output,
				summary: copy(
					count === 1
						? "admin:core.tools.emails_find.summary.one"
						: "admin:core.tools.emails_find.summary",
					{ data: { count } },
				),
			};
		},
	}).agent;

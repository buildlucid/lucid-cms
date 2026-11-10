import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import resendEmail from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const resendEmailAgentTool = () =>
	defineTool({
		name: "emails_resend",
		title: copy("admin:core.tools.emails_resend.title"),
		description:
			"Send a stored email again to the same recipients, eg. an invite that bounced. Only emails within the resend window that kept their data can be resent: check resendable with emails_get first. Only resend emails the person asked you to.",
		input: inputSchema,
		output: outputSchema,
		agent: {
			permissions: [Permissions.EmailSend],
			requiresConfirmation: true,
			describe: ({ input }) =>
				copy("admin:core.tools.emails_resend.describe", {
					data: { id: input.emailId },
				}),
		},
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(resendEmail, { transaction: true })(
				context,
				{ ...input, actor: execution.actor },
			);
			if (result.error) throw new LucidError(result.error);

			return {
				output: result.data.output,
				summary: copy("admin:core.tools.emails_resend.summary", {
					data: { id: input.emailId },
				}),
			};
		},
	}).agent;

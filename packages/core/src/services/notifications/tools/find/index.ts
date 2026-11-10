import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import findNotifications from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findNotificationsAgentTool = () =>
	defineTool({
		name: "notifications_find",
		title: copy("admin:core.tools.notifications_find.title"),
		description:
			"Find notifications sent to the person you act for, eg. to-dos, mentions, request updates and failures. Use it to see what needs their attention.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [],
			parallelSafe: true,
		},
		handler: async ({ context, input, execution }) => {
			const result = await findNotifications(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) throw new LucidError(result.error);

			const count = result.data.output.pagination.count;
			return {
				output: result.data.output,
				summary: copy(
					count === 1
						? "admin:core.tools.notifications_find.summary.one"
						: "admin:core.tools.notifications_find.summary",
					{ data: { count } },
				),
			};
		},
	}).agent;

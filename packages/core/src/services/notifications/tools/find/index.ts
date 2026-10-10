import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import findNotifications from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findNotificationsAgentTool = () =>
	defineAgentTool({
		name: "notifications_find",
		title: copy("admin:core.tools.notifications_find.title"),
		description:
			"Find notifications sent to the person you act for, eg. to-dos, mentions, request updates and failures. Use it to see what needs their attention.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await findNotifications(context, {
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
							? "admin:core.tools.notifications_find.summary.one"
							: "admin:core.tools.notifications_find.summary",
						{ data: { count } },
					),
				},
			};
		},
	});

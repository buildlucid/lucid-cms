import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import scheduleRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_schedule" satisfies AgentLucidToolName;

export const scheduleRequestAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_schedule.title"),
		description:
			"Schedule when a review request completes once it is approved, or pass at as null to remove the schedule. Changes go live at that time, so only schedule requests the person asked you to.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		requiresApproval: true,
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(scheduleRequest, {
				transaction: true,
			})(context, {
				...input,
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				runId: execution.run.id,
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						input.at === null
							? "admin:core.tools.requests_schedule.summary.removed"
							: "admin:core.tools.requests_schedule.summary",
						{ data: { id: input.requestId } },
					),
				},
			};
		},
	});

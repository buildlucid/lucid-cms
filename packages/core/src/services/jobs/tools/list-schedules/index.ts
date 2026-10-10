import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import listSchedules from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listJobSchedulesAgentTool = () =>
	defineAgentTool({
		name: "jobs_list_schedules",
		title: copy("admin:core.tools.jobs_list_schedules.title"),
		description:
			"List the registered job schedules with their cron expression, whether they are active or paused, when they next run and how their last run went. Run one early with jobs_run_schedule.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.JobsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input }) => {
			const result = await listSchedules(context, { input });
			if (result.error) return result;

			const count = result.data.output.pagination.count;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.jobs_list_schedules.summary.one"
							: "admin:core.tools.jobs_list_schedules.summary",
						{ data: { count } },
					),
				},
			};
		},
	});

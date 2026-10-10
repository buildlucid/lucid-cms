import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import runSchedule from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const runJobScheduleAgentTool = () =>
	defineAgentTool({
		name: "jobs_run_schedule",
		title: copy("admin:core.tools.jobs_run_schedule.title"),
		description:
			"Queue a registered job schedule to run now instead of waiting for its next cron time, eg. a nightly clean-up the person wants done today. Schedules that skip overlapping runs refuse while one is still running. Only run schedules the person asked you to.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.JobsRun],
		requiresApproval: true,
		describe: (input) =>
			copy("admin:core.tools.jobs_run_schedule.describe", {
				data: { schedule: input.scheduleKey },
			}),
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(runSchedule, { transaction: true })(
				context,
				{ ...input, userId: execution.run.userId },
			);
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.jobs_run_schedule.summary", {
						data: { schedule: input.scheduleKey },
					}),
				},
			};
		},
	});

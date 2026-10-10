import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import findJobs from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findJobsAgentTool = () =>
	defineAgentTool({
		name: "jobs_find",
		title: copy("admin:core.tools.jobs_find.title"),
		description:
			"Find background jobs, eg. to check whether a request completed, an email sent or a schedule ran, or to list failures. Returns each job's status, attempts and error message. Read one with jobs_get for its stack trace.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.JobsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input }) => {
			const result = await findJobs(context, { input });
			if (result.error) return result;

			const count = result.data.output.pagination.count;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.jobs_find.summary.one"
							: "admin:core.tools.jobs_find.summary",
						{ data: { count } },
					),
				},
			};
		},
	});

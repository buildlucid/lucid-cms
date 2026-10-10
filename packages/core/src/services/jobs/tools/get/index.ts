import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import getJob from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getJobAgentTool = () =>
	defineAgentTool({
		name: "jobs_get",
		title: copy("admin:core.tools.jobs_get.title"),
		description:
			"Read one background job by its job ID, including its display data, error message and stack trace. Use it to follow up on a job another tool queued.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.JobsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input }) => {
			const result = await getJob(context, { input });
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.jobs_get.summary", {
						data: { id: input.jobId },
					}),
				},
			};
		},
	});

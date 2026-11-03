import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import runDeployTool from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const runDeployAgentTool = () =>
	defineAgentTool({
		name: "deploys_run",
		title: copy("admin:core.tools.deploys_run.title"),
		description:
			"Run a deploy now, such as publishing the site, taking any changes waiting to go out with it. While another run is in progress it waits and starts as soon as that finishes. Only run deploys the person asked you to, and check deploys_get afterwards for how it went.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresConfirmation: true,
		available: ({ config }) => config.deploys.length > 0,
		describe: ({ input }) =>
			copy("admin:core.tools.deploys_run.describe", {
				data: { deploy: input.key },
			}),
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(runDeployTool, {
				transaction: true,
			})(context, {
				input,
				actor: execution.actor,
				agentRunId: execution.run.id,
				conversationId: execution.run.conversationId,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						result.data.output.queued
							? "admin:core.tools.deploys_run.summary.queued"
							: "admin:core.tools.deploys_run.summary",
						{ data: { deploy: input.key } },
					),
				},
			};
		},
	});

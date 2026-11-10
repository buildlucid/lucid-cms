import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import updateDeploy from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const updateDeployAgentTool = () =>
	defineAgentTool({
		name: "deploys_update",
		title: copy("admin:core.tools.deploys_update.title"),
		description:
			"Cancel a deploy's run in progress, or the run queued behind it, eg. when the person spots a mistake before it goes live. Only cancel runs the person asked you to.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresConfirmation: true,
		available: ({ config }) => config.deploys.length > 0,
		describe: ({ input }) =>
			copy(
				input.action === "cancel-queued"
					? "admin:core.tools.deploys_update.describe.queued"
					: "admin:core.tools.deploys_update.describe",
				{ data: { deploy: input.key } },
			),
		//* cancelling calls the host first, then saves the result in its own transaction
		handler: async ({ context, input, execution }) => {
			const result = await updateDeploy(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) throw new LucidError(result.error);

			return {
				output: result.data.output,
				summary: copy(
					input.action === "cancel-queued"
						? "admin:core.tools.deploys_update.summary.queued"
						: "admin:core.tools.deploys_update.summary",
					{ data: { deploy: input.key } },
				),
			};
		},
	});

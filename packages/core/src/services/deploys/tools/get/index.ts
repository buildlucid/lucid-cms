import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import getDeploys from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getDeploysAgentTool = () =>
	defineTool({
		name: "deploys_get",
		title: copy("admin:core.tools.deploys_get.title"),
		description:
			"Read the site's deploys: whether each is on, changes waiting to go out, the run in progress and recent runs with who started them, how long they took and why any failed. Leave out key to list them, or pass one for its full recent history.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [],
			parallelSafe: true,
			available: ({ config }) => config.deploys.length > 0,
		},
		handler: async ({ context, input, execution }) => {
			const result = await getDeploys(context, {
				input,
				actor: execution.actor,
			});
			if (result.error) throw new LucidError(result.error);

			return {
				output: result.data.output,
				summary:
					input.key === undefined
						? copy("admin:core.tools.deploys_get.summary.list", {
								data: { count: result.data.output.data.length },
							})
						: copy("admin:core.tools.deploys_get.summary", {
								data: { name: result.data.output.data[0]?.name ?? input.key },
							}),
			};
		},
	}).agent;

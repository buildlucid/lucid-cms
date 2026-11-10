import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import stopRun from "../../helpers/stop-run.js";
import resolveSubagent from "../../helpers/subagents/resolve-subagent.js";
import { subagentStopToolName } from "./constants.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Stops a sub-agent that is still working. Its chat and what it already did are kept. */
export const subagentStopAgentTool = () =>
	defineAgentTool({
		name: subagentStopToolName,
		title: copy("admin:core.tools.lucid_subagent_stop.title"),
		description:
			"Stop one of your sub-agents that is still working, eg. when its task is no longer needed or it went off track. Its chat and anything it already changed are kept.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		available: ({ mode }) => mode !== "subagent",
		handler: async ({ context, input, execution }) => {
			const subagent = await resolveSubagent(context, {
				execution,
				subagentId: input.subagentId,
			});
			if (subagent.error) throw new LucidError(subagent.error);

			const runId = subagent.data.active_run_id;
			const stopped = runId
				? await serviceWrapper(stopRun, {
						transaction: true,
					})(context, {
						runId,
						conversationId: subagent.data.id,
						tellParent: false,
					})
				: { error: undefined, data: false };
			if (stopped.error) throw new LucidError(stopped.error);

			return {
				output: { subagentId: subagent.data.id, stopped: stopped.data },
				summary: copy("admin:core.tools.lucid_subagent_stop.summary", {
					data: { title: subagent.data.title },
				}),
			};
		},
	});

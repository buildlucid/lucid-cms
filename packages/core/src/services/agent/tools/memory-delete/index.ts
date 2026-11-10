import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import deleteMemories from "../../delete-memories.js";
import { saveMemoryToolName } from "../memory-save/constants.js";
import { deleteMemoryToolName } from "./constants.js";
import prepareMemoryDelete from "./prepare.js";
import {
	inputSchema,
	outputSchema,
	reviewDataSchema,
	reviewResponseSchema,
} from "./schema.js";

/**
 * Forgets memories once the person has checked which ones will go.
 * @remarks Only offered in chats, like `lucid_memory_save`.
 */
export const deleteMemoryAgentTool = () =>
	defineTool({
		name: deleteMemoryToolName,
		title: copy("admin:core.tools.lucid_memory_delete.title"),
		description: `Forget memories, eg. when the person asks you to forget something, or a memory is wrong or out of date. The person checks which memories will be forgotten first. Use the IDs of the memories in your instructions. To change a memory instead, use ${saveMemoryToolName} with replaces.`,
		input: inputSchema,
		output: outputSchema,
		agent: {
			outputVersion: 1,
			permissions: [],
			available: ({ config, mode }) =>
				mode === "chat" &&
				(config.ai.memory.personal.enabled || config.ai.memory.shared.enabled),
			interaction: {
				key: constants.agent.widgets.memoryReview,
				version: 1,
				data: reviewDataSchema,
				response: () => reviewResponseSchema,
				prepare: async ({ context, input, execution }) => {
					const result = await prepareMemoryDelete(context, {
						input,
						authority: execution.authority,
					});
					if (result.error) throw new LucidError(result.error);
					return result.data;
				},
			},
		},
		handler: async ({ context, execution, data }) => {
			const { principal } = execution.authority;
			if (principal.type !== "user") {
				throw new LucidError({
					type: "basic",
					status: 403,
					message: copy("server:agent.tool.unavailable"),
				});
			}

			const memoryIds = data.memories.map((memory) => memory.id);
			const deleted = await serviceWrapper(deleteMemories, {
				transaction: true,
			})(context, {
				userId: principal.userId,
				ids: memoryIds,
				reviewed: data.memories,
			});
			if (deleted.error) throw new LucidError(deleted.error);

			return {
				output: { memoryIds },
				summary: copy(
					memoryIds.length === 1
						? "admin:core.tools.lucid_memory_delete.summary.one"
						: "admin:core.tools.lucid_memory_delete.summary",
					{ data: { count: memoryIds.length } },
				),
			};
		},
	}).agent;

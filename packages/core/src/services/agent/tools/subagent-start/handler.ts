import type { AgentSubagentWidgetData } from "@lucidcms/types";
import type z from "zod";
import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import hashUuid from "../../../../utils/helpers/hash-uuid.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import withTransaction from "../../../../utils/services/with-transaction.js";
import enqueueRun from "../../helpers/enqueue-run.js";
import insertConversation from "../../helpers/insert-conversation.js";
import resolveModel from "../../helpers/resolve-model.js";
import startRun from "../../helpers/start-run.js";
import checkParentRunning from "../../helpers/subagents/check-parent-running.js";
import checkSubagentLimit from "../../helpers/subagents/check-subagent-limit.js";
import getRunTimezone from "../../helpers/subagents/get-run-timezone.js";
import getStartableAgents from "../../helpers/subagents/get-startable-agents.js";
import listReferences from "../../references/list.js";
import type { inputSchema, outputSchema } from "./schema.js";

/**
 * Starts a sub-agent with the parent's principal and confirmation mode.
 * @remarks Operation-derived IDs make retries reuse the same chat.
 */
const handler: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			execution: AgentToolExecution;
			agents?: readonly string[];
		},
	],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution, agents }) => {
	const Conversations = new AgentConversationsRepository(context.db);
	const parentId = execution.run.conversationId;
	const { principal } = execution.authority;
	const userId = principal.type === "user" ? principal.userId : null;

	const parent = await Conversations.selectSingle({
		select: ["parent_conversation_id", "confirmation_mode"],
		where: [{ key: "id", operator: "=", value: parentId }],
	});
	if (parent.error) return parent;
	if (!parent.data || parent.data.parent_conversation_id) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.subagent.nested"),
			},
		};
	}

	//* read here, as narrowing doesn't reach the transaction callback below
	const confirmationMode = parent.data.confirmation_mode;

	const agent = getStartableAgents(context, {
		authority: execution.authority,
		agents,
	}).find((agent) => agent.key === input.agentKey);
	if (!agent) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.subagent.agent.unavailable", {
					data: { key: input.agentKey },
				}),
			},
		};
	}

	const model = await resolveModel(context, {
		agentKey: agent.key,
		selection: input.model,
	});
	if (model.error) return model;
	//* the model asked for these, so a silent fallback would mislead it
	if (input.model && model.data.model.id !== input.model.modelId) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.subagent.model.unavailable", {
					data: {
						model: input.model.modelId,
						models: model.data.models.map((model) => model.id).join(", "),
					},
				}),
			},
		};
	}
	if (
		input.model?.reasoningEffort &&
		model.data.selection.reasoningEffort !== input.model.reasoningEffort
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.subagent.effort.unavailable", {
					data: {
						effort: input.model.reasoningEffort,
						efforts: model.data.model.reasoningEfforts.join(", ") || "none",
					},
				}),
			},
		};
	}

	const conversationId = hashUuid(`lucid-subagent:${execution.operationId}`);
	const runId = hashUuid(`lucid-subagent-run:${execution.operationId}`);

	//* a retried call finds the sub-agent it already started
	const started = await Conversations.selectSingle({
		select: ["id"],
		where: [
			{ key: "id", operator: "=", value: conversationId },
			{ key: "parent_conversation_id", operator: "=", value: parentId },
		],
	});
	if (started.error) return started;

	if (!started.data) {
		const linked = input.referenceIds?.length
			? await listReferences(context, { conversationId: parentId, userId })
			: { error: undefined, data: [] };
		if (linked.error) return linked;

		const references = linked.data.filter((reference) =>
			input.referenceIds?.includes(reference.id),
		);
		if (references.length !== (input.referenceIds?.length ?? 0)) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 404,
					message: copy("server:agent.subagent.reference.not.found"),
				},
			};
		}

		const timezone = await getRunTimezone(context, {
			runId: execution.run.id,
		});
		if (timezone.error) return timezone;

		//* the transaction opens here rather than around the whole tool, so looking up models, which can call the remote catalogue, stays outside it
		const created = await withTransaction(context, async (context) => {
			const running = await checkParentRunning(context, {
				runId: execution.run.id,
			});
			if (running.error) return running;

			const limited = await checkSubagentLimit(context, {
				conversationId: parentId,
			});
			if (limited.error) return limited;

			const conversation = await insertConversation(context, {
				id: conversationId,
				agentKey: agent.key,
				userId,
				title: input.title,
				confirmationMode,
				modelSelection: input.model ? model.data.selection : undefined,
				parentConversationId: parentId,
			});
			if (conversation.error) return conversation;

			const run = await startRun(context, {
				conversationId,
				userId,
				runId,
				text: input.task,
				references: references.map(
					({ id: _id, source: _source, managed: _managed, ...link }) => link,
				),
				timezone: timezone.data,
				source: "parent",
			});
			if (run.error) return run;

			return enqueueRun(context, { runId, userId });
		});
		if (created.error) return created;
	}

	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);

	return {
		error: undefined,
		data: {
			output: {
				subagentId: conversationId,
				agentKey: agent.key,
				model: model.data.selection,
			},
			widgets: [
				{
					key: constants.agent.widgets.subagent,
					version: 1,
					data: {
						conversationId,
						agentKey: agent.key,
					} satisfies AgentSubagentWidgetData,
				},
			],
			summary: copy("admin:core.tools.lucid_subagent_start.summary", {
				data: { agent: translate(agent.name) },
			}),
		},
	};
};

export default handler;

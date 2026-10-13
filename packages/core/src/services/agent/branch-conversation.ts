import { randomUUID } from "node:crypto";
import type { StoredAgentMessagePart } from "../../libs/agent/messages.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentCompactionsRepository,
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentMessagesRepository,
} from "../../libs/repositories/index.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import insertConversation from "./helpers/insert-conversation.js";
import registerUrlKeys from "./helpers/register-url-keys.js";

/**
 * Copies chat history through an assistant reply outside the active run into a new personal chat.
 * @remarks Branches are plain chats owned by the requester, even when copied from routine chats.
 * Runs, queued input, usage and request links remain in the original chat.
 */
const branchConversation: ServiceFn<
	[{ conversationId: string; messageId: string; userId: number }],
	AgentConversation
> = async (context, input) => {
	const source = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (source.error) return source;

	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: source.data.agent_key,
		action: "chat",
	});
	if (access.error) return access;

	const AgentMessages = new AgentMessagesRepository(context.db);

	const message = await AgentMessages.selectSingle({
		select: ["position", "role", "run_id", "updated_at"],
		where: [
			{ key: "id", operator: "=", value: input.messageId },
			{ key: "conversation_id", operator: "=", value: input.conversationId },
		],
	});
	if (message.error) return message;
	if (message.data?.role !== "assistant") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.message.not.found"),
			},
		};
	}
	if (
		message.data.run_id !== null &&
		message.data.run_id === source.data.active_run_id
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.branch.unfinished"),
			},
		};
	}

	const branch = await insertConversation(context, {
		agentKey: source.data.agent_key,
		userId: input.userId,
		title: source.data.title,
		titleStatus: source.data.title_status,
		confirmationMode: source.data.confirmation_mode,
		modelSelection: source.data.model_selection ?? undefined,
	});
	if (branch.error) return branch;

	const through = message.data.position;
	//* use the reply's update time as the reference cutoff
	const linkedBy = formatter.formatDate(message.data.updated_at);
	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 10,
		maxItems: 100,
	});

	let after = 0;
	while (true) {
		const page = await AgentMessages.selectAfter({
			conversationId: input.conversationId,
			after,
			limit: batchSize,
		});
		if (page.error) return page;

		const copied = page.data.filter((saved) => saved.position <= through);
		if (copied.length === 0) break;

		const messages = copied.map((saved) => ({
			id: randomUUID(),
			conversation_id: branch.data.id,
			run_id: null,
			position: saved.position,
			role: saved.role,
			//* cancel inherited interactions and skip unfinished calls in the branch
			parts: saved.parts.map((part): StoredAgentMessagePart => {
				if (part.type === "tool") {
					return part.status === "pending" || part.status === "running"
						? { ...part, status: "skipped" }
						: part;
				}
				if (part.type === "widget" && part.interaction?.status === "pending") {
					return {
						...part,
						interaction: { ...part.interaction, status: "cancelled" },
					};
				}
				return part;
			}),
			created_at: formatter.formatDate(saved.created_at),
			updated_at: formatter.formatDate(saved.updated_at),
		}));

		const inserted = await AgentMessages.createMultiple({ data: messages });
		if (inserted.error) return inserted;

		for (const saved of messages) {
			const registered = await registerUrlKeys(context, {
				conversationId: branch.data.id,
				role: saved.role,
				parts: saved.parts,
			});
			if (registered.error) return registered;
		}

		const last = page.data.at(-1);
		if (!last || last.position >= through || page.data.length < batchSize) {
			break;
		}
		after = last.position;
	}

	const AgentCompactions = new AgentCompactionsRepository(context.db);
	const AgentMediaReferences = new AgentMediaReferencesRepository(context.db);
	const AgentDocumentReferences = new AgentDocumentReferencesRepository(
		context.db,
	);

	const [compactions, media, documents] = await Promise.all([
		AgentCompactions.selectMultiple({
			select: ["through_position", "summary", "created_at"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "through_position", operator: "<=", value: through },
			],
			validation: { enabled: true },
		}),
		AgentMediaReferences.selectMultiple({
			select: ["media_id", "source", "tool_name", "managed", "created_at"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "created_at", operator: "<=", value: linkedBy },
			],
			validation: { enabled: true },
		}),
		AgentDocumentReferences.selectMultiple({
			select: [
				"collection_key",
				"document_id",
				"version_id",
				"source",
				"tool_name",
				"managed",
				"created_at",
			],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "created_at", operator: "<=", value: linkedBy },
			],
			validation: { enabled: true },
		}),
	]);
	if (compactions.error) return compactions;
	if (media.error) return media;
	if (documents.error) return documents;

	for (let offset = 0; offset < compactions.data.length; offset += batchSize) {
		const inserted = await AgentCompactions.createMultiple({
			data: compactions.data.slice(offset, offset + batchSize).map((row) => ({
				id: randomUUID(),
				conversation_id: branch.data.id,
				run_id: null,
				through_position: row.through_position,
				summary: row.summary,
				created_at: formatter.formatDate(row.created_at),
			})),
		});
		if (inserted.error) return inserted;
	}

	for (let offset = 0; offset < media.data.length; offset += batchSize) {
		const inserted = await AgentMediaReferences.createMultiple({
			data: media.data.slice(offset, offset + batchSize).map((row) => ({
				...row,
				id: randomUUID(),
				conversation_id: branch.data.id,
				created_at: formatter.formatDate(row.created_at),
			})),
		});
		if (inserted.error) return inserted;
	}

	for (let offset = 0; offset < documents.data.length; offset += batchSize) {
		const inserted = await AgentDocumentReferences.createMultiple({
			data: documents.data.slice(offset, offset + batchSize).map((row) => ({
				...row,
				id: randomUUID(),
				conversation_id: branch.data.id,
				created_at: formatter.formatDate(row.created_at),
			})),
		});
		if (inserted.error) return inserted;
	}

	return { error: undefined, data: branch.data };
};

export default branchConversation;

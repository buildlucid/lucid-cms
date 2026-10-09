import type { LucidDatabase } from "../db/client/index.js";
import {
	agentRequestReferencesTable,
	type LucidAgentRequestReferences,
} from "../db/tables/agent-request-references.js";
import type { RequestType } from "../db/tables/requests.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRequestReferencesRepository extends StaticRepository<"lucid_agent_request_references"> {
	constructor(db: LucidDatabase) {
		super(db, agentRequestReferencesTable);
	}

	/** Links each request once per chat, prioritizing managed links over message attachments and other tool links. */
	async register(props: {
		conversationId: string;
		requestIds: number[];
		source: LucidAgentRequestReferences["source"];
		toolName?: string;
		managed?: boolean;
	}) {
		const now = new Date().toISOString();
		const query = this.db
			.insertInto("lucid_agent_request_references")
			.values(
				props.requestIds.map((requestId) => ({
					id: crypto.randomUUID(),
					conversation_id: props.conversationId,
					request_id: requestId,
					source: props.source,
					tool_name: props.toolName ?? null,
					managed: props.managed ?? false,
					created_at: now,
				})),
			)
			.onConflict((conflict) => {
				const target = conflict.columns(["conversation_id", "request_id"]);

				if (props.managed) {
					return target.doUpdateSet({
						source: props.source,
						tool_name: props.toolName ?? null,
						managed: true,
					});
				}

				if (props.source !== "message") return conflict.doNothing();
				return target
					.doUpdateSet({ source: "message", tool_name: null })
					.where("lucid_agent_request_references.managed", "=", false);
			});

		const result = await this.executeQuery(() => query.execute(), {
			method: "register",
		});
		return result.response;
	}
	/** Finds the latest open request linked to the chat that matches the document, source and request types. */
	async selectOpenForDocument(props: {
		conversationId: string;
		collectionKey: string;
		documentId: number;
		types: RequestType[];
		/** Latest for a proposal, or null for unpublish and delete requests. */
		source: string | null;
	}) {
		const query = this.db
			.selectFrom("lucid_agent_request_references")
			.innerJoin(
				"lucid_requests",
				"lucid_requests.id",
				"lucid_agent_request_references.request_id",
			)
			.innerJoin(
				"lucid_request_documents",
				"lucid_request_documents.request_id",
				"lucid_requests.id",
			)
			.select(["lucid_requests.id", "lucid_requests.type"])
			.where(
				"lucid_agent_request_references.conversation_id",
				"=",
				props.conversationId,
			)
			.where("lucid_requests.status", "=", "open")
			.where("lucid_requests.type", "in", props.types)
			.where("lucid_request_documents.collection_key", "=", props.collectionKey)
			.where("lucid_request_documents.document_id", "=", props.documentId)
			.where(
				"lucid_request_documents.source",
				props.source === null ? "is" : "=",
				props.source,
			)
			.orderBy("lucid_requests.id", "desc");

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectOpenForDocument",
		});
		return result.response;
	}
}

import type { LucidDatabase } from "../db/client/index.js";
import {
	agentDocumentReferencesTable,
	type LucidAgentDocumentReferences,
} from "../db/tables/agent-document-references.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentDocumentReferencesRepository extends StaticRepository<"lucid_agent_document_references"> {
	constructor(db: LucidDatabase) {
		super(db, agentDocumentReferencesTable);
	}

	/** Links documents once per chat. User attachments take precedence over tool links. */
	async register(props: {
		conversationId: string;
		documents: {
			collectionKey: string;
			documentId: number;
			versionId?: number;
		}[];
		source: LucidAgentDocumentReferences["source"];
		toolName?: string;
	}) {
		const now = new Date().toISOString();

		// Pinned and unpinned links have separate unique indexes.
		const queries = [false, true].flatMap((pinned) => {
			const documents = props.documents.filter(
				(document) => (document.versionId !== undefined) === pinned,
			);
			if (!documents.length) return [];

			return this.db
				.insertInto("lucid_agent_document_references")
				.values(
					documents.map((document) => ({
						id: crypto.randomUUID(),
						conversation_id: props.conversationId,
						collection_key: document.collectionKey,
						document_id: document.documentId,
						version_id: document.versionId ?? null,
						source: props.source,
						tool_name: props.toolName ?? null,
						created_at: now,
					})),
				)
				.onConflict((conflict) => {
					if (props.source !== "message") return conflict.doNothing();
					const target = conflict.columns([
						"conversation_id",
						"collection_key",
						"document_id",
					]);
					return (pinned ? target.column("version_id") : target)
						.where("version_id", pinned ? "is not" : "is", null)
						.doUpdateSet({ source: "message", tool_name: null });
				});
		});

		const result = await this.executeQuery(
			async () => {
				for (const query of queries) await query.execute();
			},
			{ method: "register" },
		);

		return result.response;
	}
}

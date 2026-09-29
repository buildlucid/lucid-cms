import type { LucidDatabase } from "../db/client/index.js";
import {
	agentDocumentReferencesTable,
	type LucidAgentDocumentReferences,
} from "../db/tables/agent-document-references.js";
import type { LucidVersionTableName } from "../db/tables/document-versions.js";
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

		const result = await this.executeQuery(
			async () => {
				// Pinned and unpinned links have separate unique indexes.
				for (const pinned of [false, true]) {
					const documents = props.documents.filter(
						(document) => (document.versionId !== undefined) === pinned,
					);
					if (!documents.length) continue;

					await this.db
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
						})
						.execute();
				}
			},
			{ method: "register" },
		);

		return result.response;
	}
	/** Removes links to versions that were permanently removed. Unpinned links remain. */
	async pruneVersions(props: {
		collectionKey: string;
		versionTable: LucidVersionTableName;
		documentId?: number;
	}) {
		let query = this.db
			.deleteFrom("lucid_agent_document_references")
			.where("collection_key", "=", props.collectionKey)
			.where("version_id", "is not", null);
		if (props.documentId !== undefined) {
			query = query.where("document_id", "=", props.documentId);
		}

		query = query.where((eb) =>
			eb.not(
				eb.exists(
					eb
						.selectFrom(props.versionTable)
						.select("id")
						.whereRef(
							`${props.versionTable}.id`,
							"=",
							"lucid_agent_document_references.version_id",
						),
				),
			),
		);

		const result = await this.executeQuery(() => query.execute(), {
			method: "pruneVersions",
		});
		return result.response;
	}
}

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

	/**
	 * Links documents once per chat. Managed links take over existing ones, and
	 * user attachments take precedence over other tool links.
	 */
	async register(props: {
		conversationId: string;
		documents: {
			collectionKey: string;
			documentId: number;
			versionId?: number;
		}[];
		source: LucidAgentDocumentReferences["source"];
		toolName?: string;
		managed?: boolean;
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
						managed: props.managed ?? false,
						created_at: now,
					})),
				)
				.onConflict((conflict) => {
					if (!props.managed && props.source !== "message") {
						return conflict.doNothing();
					}

					const columns = conflict.columns([
						"conversation_id",
						"collection_key",
						"document_id",
					]);

					const target = (
						pinned ? columns.column("version_id") : columns
					).where("version_id", pinned ? "is not" : "is", null);

					if (props.managed) {
						return target.doUpdateSet({
							source: props.source,
							tool_name: props.toolName ?? null,
							managed: true,
						});
					}

					return target
						.doUpdateSet({ source: "message", tool_name: null })
						.where("lucid_agent_document_references.managed", "=", false);
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

	/** Unlinks documents from a chat however they were linked. Pinned and unpinned links are matched separately. */
	async unlink(props: {
		conversationId: string;
		documents: {
			collectionKey: string;
			documentId: number;
			versionId?: number;
		}[];
	}) {
		const query = this.db
			.deleteFrom("lucid_agent_document_references")
			.where("conversation_id", "=", props.conversationId)
			.where((eb) =>
				eb.or(
					props.documents.map((document) =>
						eb.and([
							eb("collection_key", "=", document.collectionKey),
							eb("document_id", "=", document.documentId),
							document.versionId === undefined
								? eb("version_id", "is", null)
								: eb("version_id", "=", document.versionId),
						]),
					),
				),
			);

		const result = await this.executeQuery(() => query.execute(), {
			method: "unlink",
		});
		return result.response;
	}
}

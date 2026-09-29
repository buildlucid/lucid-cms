import type { LucidDatabase } from "../db/client/index.js";
import {
	agentMediaReferencesTable,
	type LucidAgentMediaReferences,
} from "../db/tables/agent-media-references.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentMediaReferencesRepository extends StaticRepository<"lucid_agent_media_references"> {
	constructor(db: LucidDatabase) {
		super(db, agentMediaReferencesTable);
	}

	/** Links media once per chat. User attachments take precedence over tool links. */
	async register(props: {
		conversationId: string;
		mediaIds: number[];
		source: LucidAgentMediaReferences["source"];
		toolName?: string;
	}) {
		const now = new Date().toISOString();
		const query = this.db
			.insertInto("lucid_agent_media_references")
			.values(
				props.mediaIds.map((mediaId) => ({
					id: crypto.randomUUID(),
					conversation_id: props.conversationId,
					media_id: mediaId,
					source: props.source,
					tool_name: props.toolName ?? null,
					created_at: now,
				})),
			)
			.onConflict((conflict) =>
				props.source === "message"
					? conflict
							.columns(["conversation_id", "media_id"])
							.doUpdateSet({ source: "message", tool_name: null })
					: conflict.doNothing(),
			);

		const result = await this.executeQuery(() => query.execute(), {
			method: "register",
		});
		return result.response;
	}
}

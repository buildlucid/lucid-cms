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

	/**
	 * Links media once per chat. Managed links take over existing ones, and user
	 * attachments take precedence over other tool links.
	 */
	async register(props: {
		conversationId: string;
		mediaIds: number[];
		source: LucidAgentMediaReferences["source"];
		toolName?: string;
		managed?: boolean;
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
					managed: props.managed ?? false,
					created_at: now,
				})),
			)
			.onConflict((conflict) => {
				const target = conflict.columns(["conversation_id", "media_id"]);

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
					.where("lucid_agent_media_references.managed", "=", false);
			});

		const result = await this.executeQuery(() => query.execute(), {
			method: "register",
		});
		return result.response;
	}
}

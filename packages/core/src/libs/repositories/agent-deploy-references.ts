import type { LucidDatabase } from "../db/client/index.js";
import {
	agentDeployReferencesTable,
	type LucidAgentDeployReferences,
} from "../db/tables/agent-deploy-references.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentDeployReferencesRepository extends StaticRepository<"lucid_agent_deploy_references"> {
	constructor(db: LucidDatabase) {
		super(db, agentDeployReferencesTable);
	}

	/** Links each deploy once per chat, prioritizing managed links over message attachments and other tool links. */
	async register(props: {
		conversationId: string;
		deployKeys: string[];
		source: LucidAgentDeployReferences["source"];
		toolName?: string;
		managed?: boolean;
	}) {
		const now = new Date().toISOString();
		const query = this.db
			.insertInto("lucid_agent_deploy_references")
			.values(
				props.deployKeys.map((deployKey) => ({
					id: crypto.randomUUID(),
					conversation_id: props.conversationId,
					deploy_key: deployKey,
					source: props.source,
					tool_name: props.toolName ?? null,
					managed: props.managed ?? false,
					created_at: now,
				})),
			)
			.onConflict((conflict) => {
				const target = conflict.columns(["conversation_id", "deploy_key"]);

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
					.where(
						"lucid_agent_deploy_references.managed",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					);
			});

		const result = await this.executeQuery(() => query.execute(), {
			method: "register",
		});
		return result.response;
	}
}

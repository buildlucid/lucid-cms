import type { LucidDatabase } from "../db/client/index.js";
import { agentUrlKeysTable } from "../db/tables/agent-url-keys.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentUrlKeysRepository extends StaticRepository<"lucid_agent_url_keys"> {
	constructor(db: LucidDatabase) {
		super(db, agentUrlKeysTable);
	}

	/** Saving a key twice is harmless, so a retried message write can register its keys again. */
	async insertMultiple(props: { conversationId: string; keys: string[] }) {
		const query = this.db
			.insertInto("lucid_agent_url_keys")
			.values(
				props.keys.map((key) => ({
					conversation_id: props.conversationId,
					url_key: key,
				})),
			)
			.onConflict((conflict) => conflict.doNothing());

		const exec = await this.executeQuery(() => query.execute(), {
			method: "insertMultiple",
		});

		return exec.response;
	}
}

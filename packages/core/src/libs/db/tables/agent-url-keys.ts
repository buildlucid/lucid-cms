import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const agentUrlKeysTable = defineTable("lucid_agent_url_keys", () => ({
	columns: {
		conversation_id: { schema: z.uuid(), type: "text" },
		url_key: { schema: z.string().length(64), type: "text" },
	},
}));

/** A URL supplied by a person or trusted tool output in this conversation. */
export interface LucidAgentUrlKeys {
	conversation_id: string;
	url_key: string;
}

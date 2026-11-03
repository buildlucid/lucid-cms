import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const deployTriggersTable = defineTable("lucid_deploy_triggers", () => ({
	columns: {
		id: { schema: z.number(), type: "primary" },
		deploy_key: { schema: z.string(), type: "text" },
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
}));

/** A trigger waiting out its deploy's debounce. Rows are only inserted, so concurrent changes never wait on each other. */
export interface LucidDeployTriggers {
	id: Generated<number>;
	deploy_key: string;
	created_at: TimestampImmutable;
}

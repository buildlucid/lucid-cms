import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampRequired } from "../types.js";

export const deployOverridesTable = defineTable(
	"lucid_deploy_overrides",
	() => ({
		columns: {
			id: { schema: z.number(), type: "primary" },
			deploy_key: { schema: z.string(), type: "text" },
			disabled_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			disabled_by_user_id: { schema: z.number().nullable(), type: "integer" },
		},
	}),
);

/** A deploy someone turned off in the admin. Deploys without a row are on. */
export interface LucidDeployOverrides {
	id: Generated<number>;
	deploy_key: string;
	disabled_at: TimestampRequired;
	disabled_by_user_id: number | null;
}

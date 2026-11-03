import type { Generated } from "kysely";
import z from "zod";
import {
	deployRunSourceSchema,
	deployRunStatusSchema,
} from "../../../schemas/deploys.js";
import type {
	DeployRunSource,
	DeployRunStatus,
} from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const deployRunsTable = defineTable("lucid_deploy_runs", () => ({
	columns: {
		id: { schema: z.number(), type: "primary" },
		deploy_key: { schema: z.string(), type: "text" },
		status: { schema: deployRunStatusSchema, type: "text" },
		source: { schema: deployRunSourceSchema, type: "text" },
		trigger_count: { schema: z.number(), type: "integer" },
		started_by_user_id: { schema: z.number().nullable(), type: "integer" },
		agent_run_id: { schema: z.uuid().nullable(), type: "text" },
		external_id: { schema: z.string().nullable(), type: "text" },
		url: { schema: z.string().nullable(), type: "text" },
		message: { schema: z.string().nullable(), type: "text" },
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		started_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		expires_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		finished_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	query: {
		filters: {
			deployKey: "deploy_key",
			status: "status",
			source: "source",
		},
		sorts: {
			createdAt: "created_at",
		},
	},
}));

/**
 * One run of a deploy. Each deploy has at most one queued run and one starting or running run,
 * which partial unique indexes enforce.
 */
export interface LucidDeployRuns {
	id: Generated<number>;
	deploy_key: string;
	status: DeployRunStatus;
	source: DeployRunSource;
	trigger_count: number;
	started_by_user_id: number | null;
	/** The agent run that started it, resolved through agent attributions. */
	agent_run_id: string | null;
	/** The host's ID for the run, matched by status checks and webhooks. */
	external_id: string | null;
	url: string | null;
	message: string | null;
	created_at: TimestampImmutable;
	started_at: TimestampMutable;
	/** When an unfinished run times out. */
	expires_at: TimestampMutable;
	finished_at: TimestampMutable;
}

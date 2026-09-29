import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { aiUsageSessionTypeSchema } from "../../../schemas/ai.js";
import type { AiUsageSessionType } from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const aiGenerationsTable = defineTable("lucid_ai_generations", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		request_id: {
			schema: z.string(),
			type: "text",
		},
		provider_request_id: {
			schema: z.string().nullable(),
			type: "text",
		},
		feature_key: {
			schema: z.string(),
			type: "text",
		},
		feature_version: {
			schema: z.string(),
			type: "text",
		},
		user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		lucid_remote_connection_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		agent_run_id: { schema: z.uuid().nullable(), type: "text" },
		session_type: {
			schema: aiUsageSessionTypeSchema,
			type: "text",
		},
		session_id: {
			schema: z.string(),
			type: "text",
		},
		target: {
			schema: z.record(z.string(), z.unknown()).nullable(),
			type: "json",
		},
		output: {
			schema: z.record(z.string(), z.unknown()).nullable(),
			type: "json",
		},
		usage: {
			schema: z.record(z.string(), z.unknown()).nullable(),
			type: "json",
		},
		model: {
			schema: z.string().nullable(),
			type: "text",
		},
		credits: {
			schema: z.number().nullable(),
			type: "integer",
		},
		input_tokens: {
			schema: z.number().nullable(),
			type: "integer",
		},
		output_tokens: {
			schema: z.number().nullable(),
			type: "integer",
		},
		total_tokens: {
			schema: z.number().nullable(),
			type: "integer",
		},
		duration_ms: {
			schema: z.number().nullable(),
			type: "integer",
		},
		status: {
			schema: z.enum(["failed", "pending", "success"]),
			type: "text",
		},
		error_message: {
			schema: z.string().nullable(),
			type: "text",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
	query: {
		filters: {
			sessionType: "lucid_ai_generations.session_type",
			userId: "lucid_ai_generations.user_id",
		},
		//* session sorts order by the aggregates selected in `selectSessions`
		sorts: {
			lastActivityAt: "last_activity_at",
			credits: "credits",
			totalTokens: "total_tokens",
		},
	} as const,
}));

export type AiGenerationStatus = "failed" | "pending" | "success";

export interface LucidAiGenerations {
	id: Generated<number>;
	request_id: string;
	provider_request_id: string | null;
	feature_key: string;
	feature_version: string;
	user_id: number | null;
	lucid_remote_connection_id: number | null;
	agent_run_id: string | null;
	session_type: AiUsageSessionType;
	session_id: string;
	target: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	output: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	usage: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	model: string | null;
	credits: number | null;
	input_tokens: number | null;
	output_tokens: number | null;
	total_tokens: number | null;
	duration_ms: number | null;
	status: AiGenerationStatus;
	error_message: string | null;
	created_at: TimestampImmutable;
}

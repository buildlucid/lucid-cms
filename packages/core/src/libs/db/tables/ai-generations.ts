import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
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
		target_type: {
			schema: z.string(),
			type: "text",
		},
		target: {
			schema: z.record(z.string(), z.unknown()),
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
		credits_charged: {
			schema: z.string().nullable(),
			type: "text",
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
	results: {
		profile_picture: {},
		crop: {},
		translations: {},
	},
	query: {
		filters: {
			requestId: "lucid_ai_generations.request_id",
			providerRequestId: "lucid_ai_generations.provider_request_id",
			featureKey: "lucid_ai_generations.feature_key",
			featureVersion: "lucid_ai_generations.feature_version",
			status: "lucid_ai_generations.status",
			model: "lucid_ai_generations.model",
			userId: "lucid_ai_generations.user_id",
			targetType: "lucid_ai_generations.target_type",
			durationMs: "lucid_ai_generations.duration_ms",
			createdAt: "lucid_ai_generations.created_at",
		},
		sorts: {
			createdAt: "lucid_ai_generations.created_at",
			cost: "lucid_ai_generations.credits_charged",
			durationMs: "lucid_ai_generations.duration_ms",
		},
		operators: {
			requestId: "contains",
			providerRequestId: "contains",
			model: "contains",
			targetType: "contains",
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
	target_type: string;
	target: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
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
	credits_charged: string | null;
	duration_ms: number | null;
	status: AiGenerationStatus;
	error_message: string | null;
	created_at: TimestampImmutable;
}

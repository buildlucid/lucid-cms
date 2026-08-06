import type { ColumnType, Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	emailDeliveryStatusSchema,
	emailPrioritySchema,
	emailTypeSchema,
} from "../../../schemas/email.js";
import type { EmailStorageConfig } from "../../email/storage/types.js";
import type {
	EmailDeliveryStatus,
	EmailHeaders,
	EmailPriority,
	EmailType,
} from "../../email/types.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

const emailStorageRuleSchema = z.union([
	z.strictObject({
		encrypt: z.literal(true),
		redact: z.literal(true).optional(),
		previewFallback: z.unknown().optional(),
	}),
	z.strictObject({
		redact: z.literal(true),
		encrypt: z.literal(true).optional(),
		previewFallback: z.unknown().optional(),
	}),
	z.strictObject({
		neverStore: z.literal(true),
		previewFallback: z.unknown().optional(),
	}),
]);

export const emailsTable = defineTable("lucid_emails", (adapter) => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		from_address: {
			schema: z.string(),
			type: "text",
		},
		from_name: {
			schema: z.string(),
			type: "text",
		},
		to_address: {
			schema: z.string(),
			type: "text",
		},
		subject: {
			schema: z.string(),
			type: "text",
		},
		cc: {
			schema: z.string().nullable(),
			type: "text",
		},
		bcc: {
			schema: z.string().nullable(),
			type: "text",
		},
		template: {
			schema: z.string(),
			type: "text",
		},
		priority: {
			schema: emailPrioritySchema,
			type: "text",
		},
		headers: {
			schema: z.record(z.string(), z.string()).nullable(),
			type: "json",
		},
		data: {
			schema: z.record(z.string(), z.unknown()).nullable(),
			type: "json",
		},
		storage_strategy: {
			schema: z.record(z.string(), emailStorageRuleSchema).nullable(),
			type: "json",
		},
		type: {
			schema: emailTypeSchema,
			type: "text",
		},
		is_system: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		current_status: {
			schema: emailDeliveryStatusSchema,
			type: "text",
		},
		attempt_count: {
			schema: z.number(),
			type: "integer",
		},
		last_attempted_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	results: {
		attachments: {
			schema: z
				.array(
					z.object({
						type: z.literal("url"),
						url: z.string(),
						filename: z.string(),
						content_type: z.string().nullable(),
						disposition: z.union([
							z.literal("attachment"),
							z.literal("inline"),
						]),
						content_id: z.string().nullable(),
						order: z.number(),
					}),
				)
				.optional(),
		},
		transactions: {
			schema: z
				.array(
					z.object({
						delivery_status: emailDeliveryStatusSchema,
						message: z.string().nullable(),
						strategy_identifier: z.string(),
						strategy_data: z.record(z.string(), z.unknown()).nullable(),
						simulate: z.union([
							z.literal(adapter.config.defaults.boolean.true),
							z.literal(adapter.config.defaults.boolean.false),
						]),
						external_message_id: z.string().nullable(),
						created_at: z.union([z.string(), z.date()]).nullable(),
						updated_at: z.union([z.string(), z.date()]).nullable(),
					}),
				)
				.optional(),
		},
		strategy_data: {},
	},
	query: {
		filters: {
			fromAddress: "from_address",
			toAddress: "to_address",
			subject: "subject",
			type: "type",
			template: "template",
			priority: "priority",
			currentStatus: "current_status",
			attemptCount: "attempt_count",
			lastAttemptedAt: "last_attempted_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		sorts: {
			attemptCount: "attempt_count",
			lastAttemptedAt: "last_attempted_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		operators: {
			subject: "contains",
			template: "contains",
		},
	} as const,
}));

export interface LucidEmails {
	id: Generated<number>;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	template: string;
	priority: EmailPriority;
	headers: JSONColumnType<
		EmailHeaders,
		EmailHeaders | null,
		EmailHeaders | null
	>;
	data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	storage_strategy: JSONColumnType<
		EmailStorageConfig,
		EmailStorageConfig | null,
		EmailStorageConfig | null
	>;
	type: EmailType;
	is_system: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	current_status: EmailDeliveryStatus;
	attempt_count: number;
	last_attempted_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

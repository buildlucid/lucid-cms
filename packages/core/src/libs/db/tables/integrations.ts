import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const integrationsTable = defineTable(
	"lucid_integrations",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			name: {
				schema: z.string(),
				type: "text",
			},
			description: {
				schema: z.string().nullable(),
				type: "text",
			},
			enabled: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			user_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			key: {
				schema: z.string(),
				type: "text",
			},
			api_key: {
				schema: z.string(),
				type: "text",
			},
			secret: {
				schema: z.string(),
				type: "text",
			},
			last_used_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			last_used_ip: {
				schema: z.string().nullable(),
				type: "varchar",
				args: [255],
			},
			last_used_user_agent: {
				schema: z.string().nullable(),
				type: "text",
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
			scopes: {
				schema: z
					.array(
						z.object({
							scope: z.string(),
						}),
					)
					.optional(),
			},
		},
		query: {
			filters: {
				key: "key",
				name: "name",
				description: "description",
				enabled: "enabled",
				expiresAt: "expires_at",
				lastUsedAt: "last_used_at",
				lastUsedIp: "last_used_ip",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			sorts: {
				name: "name",
				description: "description",
				enabled: "enabled",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			operators: {
				name: "contains",
				description: "contains",
			},
		} as const,
	}),
);

export interface LucidIntegrations {
	id: Generated<number>;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	user_id: number | null;
	expires_at: TimestampMutable;
	key: string;
	api_key: string;
	secret: string;
	last_used_at: TimestampMutable;
	last_used_ip: string | null;
	last_used_user_agent: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

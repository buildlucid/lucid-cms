import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const userAuthProvidersTable = defineTable(
	"lucid_user_auth_providers",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			provider_key: {
				schema: z.string(),
				type: "text",
			},
			provider_user_id: {
				schema: z.string(),
				type: "text",
			},
			linked_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			metadata: {
				schema: z.record(z.string(), z.unknown()).nullable(),
				type: "json",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
		results: {
			// user
			user_email: {
				schema: z.email(),
			},
			user_first_name: {
				schema: z.string().nullable(),
			},
			user_last_name: {
				schema: z.string().nullable(),
			},
			user_invitation_accepted: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
			},
			user_is_deleted: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
			},
			user_is_locked: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
			},
		},
		query: {
			filters: {
				userId: "user_id",
				providerKey: "provider_key",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				providerKey: "provider_key",
			},
			operators: {
				providerKey: "contains",
			},
		} as const,
	}),
);

export interface LucidUserAuthProviders {
	id: Generated<number>;
	user_id: number;
	provider_key: string;
	provider_user_id: string;
	linked_at: TimestampImmutable;
	metadata: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const rolesTable = defineTable("lucid_roles", (adapter) => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		key: {
			schema: z.string().nullable(),
			type: "text",
		},
		locked: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	results: {
		permissions: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						role_id: z.number(),
						permission: z.string(),
					}),
				)
				.optional(),
		},
		translations: {
			schema: z
				.array(
					z.object({
						name: z.string().nullable(),
						description: z.string().nullable(),
						locale_code: z.string(),
					}),
				)
				.optional(),
		},
	},
	query: {
		filters: {
			name: "translation.name",
			description: "translation.description",
			roleIds: "lucid_roles.id",
			locked: "lucid_roles.locked",
			createdAt: "lucid_roles.created_at",
			updatedAt: "lucid_roles.updated_at",
		},
		sorts: {
			name: "translation.name",
			createdAt: "lucid_roles.created_at",
		},
		operators: {
			name: "contains",
			description: "contains",
		},
	} as const,
}));

export interface LucidRoles {
	id: Generated<number>;
	key: string | null;
	locked: BooleanInt;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

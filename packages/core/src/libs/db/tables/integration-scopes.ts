import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const integrationScopesTable = defineTable(
	"lucid_integration_scopes",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			integration_id: {
				schema: z.number(),
				type: "integer",
			},
			scope: {
				schema: z.string(),
				type: "text",
			},
			core: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
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
	}),
);

export interface LucidIntegrationScopes {
	id: Generated<number>;
	integration_id: number;
	scope: string;
	core: BooleanInt;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

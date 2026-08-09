import type { Generated } from "kysely";
import z from "zod";
import type { BrickTypes } from "../../collection/builders/brick-builder/types.js";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt } from "../types.js";

export const documentBricksTable = defineTable(
	"lucid_document__collection-key__fld",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			collection_key: {
				schema: z.string(),
				type: "text",
			},
			document_id: {
				schema: z.number(),
				type: "integer",
			},
			document_version_id: {
				schema: z.number(),
				type: "integer",
			},
			locale: {
				schema: z.string(),
				type: "text",
			},
			position: {
				schema: z.number().optional(),
				type: "integer",
			},
			is_open: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			// brick specific
			brick_type: {
				schema: z
					.union([
						z.literal("fixed"),
						z.literal("builder"),
						z.literal("embedded"),
					])
					.optional(),
				type: "text",
			},
			brick_instance_id: {
				schema: z.string().optional(),
				type: "text",
			},
			// brick and document-field specific
			brick_id_ref: {
				schema: z.number().optional(),
				type: "integer",
			},
			// repeater specific
			brick_id: {
				schema: z.number().optional(),
				type: "integer",
			},
			parent_id: {
				schema: z.number().optional(),
				type: "integer",
			},
			parent_id_ref: {
				schema: z.number().optional(),
				type: "integer",
			},
		},
	}),
	{
		priority: 200,
		matches: (tableName) =>
			tableName.startsWith("lucid_document__") &&
			tableName.split("__").length >= 3 &&
			!tableName.endsWith("__ver"),
	},
);

export type LucidBrickTableName =
	| `lucid_document__${string}__fld`
	| `lucid_document__${string}__${string}`
	| `lucid_document__${string}__${string}__${string}`;

type CustomFieldColumnName = string;

export interface LucidBricksTable {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	document_version_id: number;
	locale: string;
	position: number;
	is_open: BooleanInt;
	// brick specific
	brick_type?: BrickTypes;
	brick_instance_id?: string;
	// brick and document-field specific
	brick_id_ref?: number;
	// repeater specific
	parent_id?: number | null;
	parent_id_ref?: number | null;
	brick_id?: number;
	// dynamic
	[key: CustomFieldColumnName]: unknown;
}
